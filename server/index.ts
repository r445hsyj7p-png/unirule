/**
 * Unirule Backend Proxy Server
 * - Proxies requests to UniFi Controller (bypasses CORS + self-signed TLS)
 * - Serves the Vite production build
 * - Normalises UniFi API responses into Unirule's internal schema
 */

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import bcrypt from 'bcryptjs'
import {
  setUnifiConfig, getUnifiClient, getUnifiConfig, clearUnifiConfig, UnifiClient,
  type UnifiConfig, type UnifiDevice, type UnifiClient as UClient,
  type UnifiEvent, type UnifiNetwork,
} from './unifi-client.js'
import {
  requireAuth, handleAuthStatus, handleSetup,
  handleLogin, handleLogout, handleMe, handleBlockedIps,
  getAuthStore, updatePassword,
} from './auth.js'
import { simulatePacket } from './simulate.js'
import { lookupOui, inferCategory } from './oui.js'
import { startIngestion, stopIngestion } from './ingestion.js'
import { normalizeEvent } from './event-normalize.js'
import {
  handleHistoryEvents, handleHistoryMetrics,
  handleGetNotifications, handleMarkNotificationsRead,
  handleGetSettings, handleUpdateSettings,
  handleDbStats, writeAuditLog,
  handleGetKnownDevices, handleUpdateKnownDevice,
  handleGetAuditLog, handlePurgeData, handleExportEventsCsv,
  handleGetSecuritySettings, handleUpdateSecuritySettings,
  handleGetNotificationSettings, handleUpdateNotificationSettings,
} from './history.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3000

// ── Middleware ────────────────────────────────────────────────────────────────
const devOrigin = process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : false
app.use(cors({ origin: devOrigin, credentials: !!devOrigin }))
app.use(express.json())
app.use(cookieParser())

// ── Auth endpoints (public — no requireAuth) ─────────────────────────────────
app.get('/api/auth/status',      handleAuthStatus)
app.post('/api/auth/setup',      handleSetup)
app.post('/api/auth/login',      handleLogin)
app.post('/api/auth/logout',     handleLogout)
app.get('/api/auth/me',          requireAuth, handleMe)
app.get('/api/auth/blocked-ips', requireAuth, handleBlockedIps)

// ── All subsequent /api/* routes require authentication ──────────────────────
app.use('/api', requireAuth)

// Persistent config in /data/config.json (mounted volume in production)
const CONFIG_PATH = process.env.CONFIG_PATH ?? path.join(__dirname, '..', 'data', 'config.json')

function loadPersistedConfig(): UnifiConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      const cfg = JSON.parse(raw) as UnifiConfig
      setUnifiConfig(cfg)
      console.log(`[config] Loaded from ${CONFIG_PATH}`)
      return cfg
    }
  } catch { /* ignore */ }
  return null
}

function saveConfig(cfg: UnifiConfig) {
  try {
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 })
    // Fix 9 (complete): writeFileSync mode only applies to *new* files via O_CREAT;
    // explicitly tighten permissions on an already-existing file too.
    try { fs.chmodSync(CONFIG_PATH, 0o600) } catch { /* non-fatal */ }
  } catch (e) {
    console.warn('[config] Could not persist config:', e)
  }
}

loadPersistedConfig()

// Start background ingestion if already configured on boot
if (getUnifiConfig()) {
  startIngestion()
}

// ── Helper ────────────────────────────────────────────────────────────────────

function apiError(res: express.Response, err: unknown, status = 500) {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg === 'NOT_CONFIGURED') {
    return res.status(503).json({ error: 'NOT_CONFIGURED', message: 'UniFi connection not configured. Go to Settings → Integrationen.' })
  }
  console.error('[api error]', msg)
  return res.status(status).json({ error: msg })
}

// ── Config endpoints ──────────────────────────────────────────────────────────

app.get('/api/config', (_req, res) => {
  const cfg = getUnifiConfig()
  if (!cfg) return res.json({ configured: false })
  // Never send password back
  const { password: _pw, ...safe } = cfg
  return res.json({ configured: true, ...safe })
})

app.post('/api/config', async (req, res) => {
  const cfg = req.body as UnifiConfig
  if (!cfg.url || !cfg.username || !cfg.password) {
    return res.status(400).json({ error: 'url, username, password required' })
  }
  // Fix 2: test with a temporary client BEFORE overwriting the live singleton,
  // so a failed re-config never destroys a working connection.
  try {
    const tmp = new UnifiClient(cfg)
    const test = await tmp.testConnection()
    if (!test.ok) {
      return res.status(502).json({ error: 'Connection failed', detail: test.version })
    }
    setUnifiConfig(cfg)
    saveConfig(cfg)
    startIngestion()  // idempotent — noop if already running
    return res.json({ ok: true, site: test.siteName, version: test.version })
  } catch (e) {
    return apiError(res, e)
  }
})

app.post('/api/config/test', async (req, res) => {
  // Fix 4: wrap in try/catch so network errors return JSON instead of hanging
  try {
    const cfg = req.body as UnifiConfig
    const tmp = new UnifiClient(cfg)
    const result = await tmp.testConnection()
    return res.json(result)
  } catch (e) {
    return apiError(res, e)
  }
})

app.delete('/api/config', (_req, res) => {
  try { fs.unlinkSync(CONFIG_PATH) } catch { /* ok */ }
  stopIngestion()
  clearUnifiConfig()
  return res.json({ ok: true })
})

// ── UniFi data endpoints ──────────────────────────────────────────────────────

// GET /api/unifi/devices
// Returns normalised device list (infrastructure: APs, switches, gateways)
app.get('/api/unifi/devices', async (_req, res) => {
  try {
    const client = getUnifiClient()
    const raw = await client.getDevices()
    const devices = raw.map((d: UnifiDevice) => ({
      id: d._id,
      name: d.name ?? d.mac,
      mac: d.mac,
      ip: d.ip ?? '',
      model: d.model ?? '',
      type: d.type,            // ugw, usw, uap, udm …
      version: d.version ?? '',
      status: d.state === 1 ? 'online' : 'offline',
      lastSeen: d.last_seen ? new Date(d.last_seen * 1000).toISOString() : null,
      clients: d.num_sta ?? 0,
      uptime: d.uptime ?? 0,
    }))
    return res.json(devices)
  } catch (e) { return apiError(res, e) }
})

// GET /api/unifi/clients
// Returns all connected clients (end devices)
app.get('/api/unifi/clients', async (_req, res) => {
  try {
    const client = getUnifiClient()
    const [active, all, networks] = await Promise.all([
      client.getClients(),
      client.getAllClients().catch(() => [] as UClient[]),
      client.getNetworks(),
    ])
    // Fix 8: skip networks without a VLAN id to avoid all undefined-VLAN
    // entries collapsing onto the same "undefined" key in the Map.
    const netMap = new Map(
      networks
        .filter((n: UnifiNetwork) => n.vlan != null)
        .map((n: UnifiNetwork) => [String(n.vlan), n.name]),
    )

    function toDevice(c: UClient, isActive: boolean) {
      // 1. Try MAC-prefix lookup (OUI_DB)
      const ouiInfo = lookupOui(c.mac)
      // 2. If not in DB: use UniFi's own manufacturer string (e.g. "Apple, Inc.")
      const manufacturer = ouiInfo.manufacturer !== 'Unknown'
        ? ouiInfo.manufacturer
        : (c.oui ?? '')
      // 3. Category: DB result if known; otherwise run heuristic on manufacturer name
      //    (lookupOui fallback receives the MAC hex string which never matches keyword
      //    patterns — we must explicitly call inferCategory on the human-readable name)
      const category = ouiInfo.category !== 'unknown'
        ? ouiInfo.category
        : inferCategory(manufacturer)
      return {
        id: c._id,
        name: c.hostname ?? c.mac,
        mac: c.mac,
        ip: c.ip ?? '',
        zone: netMap.get(c.vlan?.toString() ?? '') ?? c.network ?? 'Unbekannt',
        vlan: c.vlan,
        status: isActive ? 'online' : 'offline',
        lastSeen: c.last_seen ? new Date(c.last_seen * 1000).toISOString() : null,
        uptime: c.uptime,
        rxBytes: c.rx_bytes,
        txBytes: c.tx_bytes,
        signal: c.signal,
        oui: manufacturer,
        category,
      }
    }

    const activeMacs = new Set(active.map((c: UClient) => c.mac))
    const activeList = active.map((c: UClient) => toDevice(c, true))
    const historicList = (all as UClient[])
      .filter((c: UClient) => !activeMacs.has(c.mac))
      .slice(0, 200)
      .map((c: UClient) => toDevice(c, false))

    return res.json([...activeList, ...historicList])
  } catch (e) { return apiError(res, e) }
})

// GET /api/unifi/events?limit=500&subsystem=&type=
// Returns events as normalised log entries
app.get('/api/unifi/events', async (req, res) => {
  try {
    const client = getUnifiClient()
    // Fix 7: validate limit — reject NaN, 0, and negatives; cap at 5000
    const parsed = parseInt(String(req.query.limit ?? '500'), 10)
    const limit  = Math.min(Number.isNaN(parsed) || parsed <= 0 ? 500 : parsed, 5000)
    const raw = await client.getEvents(limit)

    const logs = raw.map((e: UnifiEvent) => {
      const norm = normalizeEvent(e)
      return {
        id:        e._id,
        timestamp: new Date(norm.timestamp).toISOString(),
        level:     norm.level,
        source:    norm.source,
        message:   norm.message,
        device:    norm.device,
        ip:        norm.ip,
        dstIp:     norm.dstIp,
        dstPort:   norm.dstPort,
        proto:     norm.proto,
        raw:       e,
      }
    })
    return res.json(logs)
  } catch (e) { return apiError(res, e) }
})

// GET /api/unifi/firewall
app.get('/api/unifi/firewall', async (_req, res) => {
  try {
    const client = getUnifiClient()
    const raw = await client.getFirewallRules()
    return res.json(raw.map(r => ({
      id: r._id,
      name: r.name,
      enabled: r.enabled,
      action: r.action,
      protocol: r.protocol ?? 'any',
      srcAddress: r.src_address ?? 'any',
      dstAddress: r.dst_address ?? 'any',
      srcPort: r.src_port ?? 'any',
      dstPort: r.dst_port ?? 'any',
      ruleset: r.ruleset,
    })))
  } catch (e) { return apiError(res, e) }
})

// GET /api/unifi/networks
app.get('/api/unifi/networks', async (_req, res) => {
  try {
    const client = getUnifiClient()
    const raw = await client.getNetworks()
    return res.json(raw.map((n: UnifiNetwork) => ({
      id: n._id,
      name: n.name,
      purpose: n.purpose,
      vlan: n.vlan,
      cidr: n.ip_subnet ?? '',
      gateway: n.dhcpd_gateway ?? '',
      enabled: n.enabled,
      devices: n.num_sta ?? 0,
    })))
  } catch (e) { return apiError(res, e) }
})

// GET /api/unifi/health
app.get('/api/unifi/health', async (_req, res) => {
  try {
    const client = getUnifiClient()
    const raw = await client.getHealth()
    return res.json(raw)
  } catch (e) { return apiError(res, e) }
})

// GET /api/unifi/alarms
app.get('/api/unifi/alarms', async (_req, res) => {
  try {
    const client = getUnifiClient()
    const raw = await client.getAlarms()
    return res.json(raw)
  } catch (e) { return apiError(res, e) }
})

// ── History & settings routes ─────────────────────────────────────────────────
app.get ('/api/history/events',                  handleHistoryEvents)
app.get ('/api/history/metrics',                 handleHistoryMetrics)
app.get ('/api/history/notifications',           handleGetNotifications)
app.post('/api/history/notifications/read-all',  handleMarkNotificationsRead)
app.get ('/api/settings',                        handleGetSettings)
app.put ('/api/settings',                        handleUpdateSettings)
app.get ('/api/history/stats',                   handleDbStats)

// Phase 3 routes
app.get  ('/api/devices/known',         requireAuth, handleGetKnownDevices)
app.patch('/api/devices/known/:mac',    requireAuth, handleUpdateKnownDevice)
app.get  ('/api/history/audit',         requireAuth, handleGetAuditLog)
app.post ('/api/history/purge',         requireAuth, handlePurgeData)
app.get  ('/api/history/events/export', requireAuth, handleExportEventsCsv)

// Phase 4 routes
app.get('/api/settings/security',       requireAuth, handleGetSecuritySettings)
app.put('/api/settings/security',       requireAuth, handleUpdateSecuritySettings)
app.get('/api/settings/notifications',  requireAuth, handleGetNotificationSettings)
app.put('/api/settings/notifications',  requireAuth, handleUpdateNotificationSettings)

// ── Firewall toggle ───────────────────────────────────────────────────────────
// PATCH /api/unifi/firewall/:id  { enabled: boolean }
app.patch('/api/unifi/firewall/:id', async (req, res) => {
  const { id } = req.params
  const { enabled } = req.body as { enabled?: unknown }
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'INVALID_BODY', message: '`enabled` (boolean) required' })
  }
  try {
    const client = getUnifiClient()
    const updated = await client.updateFirewallRule(id, { enabled })
    // Audit log (fire-and-forget, non-fatal)
    const clientIp = (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.socket?.remoteAddress) ?? ''
    writeAuditLog({
      action:     enabled ? 'enable' : 'disable',
      entityType: 'firewall_rule',
      entityId:   id,
      entityName: updated.name,
      oldValue:   String(!enabled),
      newValue:   String(enabled),
      userIp:     clientIp,
    })
    return res.json({
      id: updated._id,
      name: updated.name,
      enabled: updated.enabled,
      action: updated.action,
      protocol: updated.protocol ?? 'any',
      srcAddress: updated.src_address ?? 'any',
      dstAddress: updated.dst_address ?? 'any',
      srcPort: updated.src_port ?? 'any',
      dstPort: updated.dst_port ?? 'any',
      ruleset: updated.ruleset,
    })
  } catch (e) { return apiError(res, e) }
})

// ── Simulation ────────────────────────────────────────────────────────────────
// POST /api/simulate/packet
app.post('/api/simulate/packet', async (req, res) => {
  const body = req.body as Record<string, unknown>
  const { srcIp, dstIp } = body
  const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/
  if (typeof srcIp !== 'string' || !IP_RE.test(srcIp)) {
    return res.status(400).json({ error: 'INVALID_BODY', message: '`srcIp` muss eine gültige IPv4-Adresse sein' })
  }
  if (typeof dstIp !== 'string' || !IP_RE.test(dstIp)) {
    return res.status(400).json({ error: 'INVALID_BODY', message: '`dstIp` muss eine gültige IPv4-Adresse sein' })
  }
  try {
    const client = getUnifiClient()
    const [rawRules, rawNetworks] = await Promise.all([
      client.getFirewallRules(),
      client.getNetworks(),
    ])

    const apiRules = rawRules.map(r => ({
      id: r._id,
      name: r.name,
      enabled: r.enabled,
      action: r.action,
      protocol: r.protocol ?? 'any',
      srcAddress: r.src_address ?? 'any',
      dstAddress: r.dst_address ?? 'any',
      srcPort: r.src_port ?? 'any',
      dstPort: r.dst_port ?? 'any',
      ruleset: r.ruleset,
    }))

    const apiNetworks = (rawNetworks as UnifiNetwork[]).map(n => ({
      id: n._id,
      name: n.name,
      purpose: n.purpose,
      vlan: n.vlan,
      cidr: n.ip_subnet ?? '',
      gateway: n.dhcpd_gateway ?? '',
      enabled: n.enabled,
    }))

    const params = {
      srcIp,
      dstIp,
      dstPort: typeof body.dstPort === 'number' ? body.dstPort : undefined,
      proto: (body.proto as 'tcp' | 'udp' | 'icmp' | 'all' | undefined),
      hypotheticalRules: Array.isArray(body.hypotheticalRules) ? body.hypotheticalRules : undefined,
    }

    const result = simulatePacket(params, apiRules, apiNetworks)
    return res.json(result)
  } catch (e) { return apiError(res, e) }
})

// ── Auth: change password ─────────────────────────────────────────────────────
// POST /api/auth/change-password
// Rate-limited: 5 wrong-oldPassword attempts per IP per 15 minutes
const changePwFailures = new Map<string, { count: number; until: number }>()
function changePwClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const ip = changePwClientIp(req)
  const now = Date.now()
  const entry = changePwFailures.get(ip)
  if (entry && now < entry.until) {
    const mins = Math.ceil((entry.until - now) / 60_000)
    return res.status(429).json({ error: 'RATE_LIMITED', message: `Zu viele Fehlversuche. Bitte ${mins} Minute(n) warten.` })
  }

  const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string }
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'oldPassword und newPassword erforderlich.' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Neues Passwort mindestens 8 Zeichen.' })
  }
  const store = getAuthStore()
  if (!store) {
    return res.status(503).json({ error: 'NOT_SETUP' })
  }
  const match = await bcrypt.compare(oldPassword, store.passwordHash)
  if (!match) {
    const cur = changePwFailures.get(ip) ?? { count: 0, until: 0 }
    cur.count++
    if (cur.count >= 5) cur.until = now + 15 * 60_000
    changePwFailures.set(ip, cur)
    return res.status(401).json({ error: 'INVALID_PASSWORD', message: 'Aktuelles Passwort ist falsch.' })
  }
  // Success — clear failure counter
  changePwFailures.delete(ip)
  try {
    await updatePassword(newPassword)
    return res.json({ ok: true })
  } catch (e) { return apiError(res, e) }
})

// ── Serve Vite build ──────────────────────────────────────────────────────────
const DIST = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  // Express 5: bare '*' is rejected by path-to-regexp; use named wildcard
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))
} else {
  app.get('/', (_req, res) => res.json({ status: 'Unirule API running', note: 'Run npm run build for UI' }))
}

app.listen(PORT, () => {
  console.log(`[unirule] Server running on http://localhost:${PORT}`)
  console.log(`[unirule] UniFi configured: ${getUnifiConfig() !== null}`)
})
