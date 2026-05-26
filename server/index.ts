/**
 * Unirule Backend Proxy Server
 * - Proxies requests to UniFi Controller (bypasses CORS + self-signed TLS)
 * - Serves the Vite production build
 * - Normalises UniFi API responses into Unirule's internal schema
 */

import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import {
  setUnifiConfig, getUnifiClient, getUnifiConfig, UnifiClient,
  type UnifiConfig, type UnifiDevice, type UnifiClient as UClient,
  type UnifiEvent, type UnifiNetwork,
} from './unifi-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3000

// ── Middleware ────────────────────────────────────────────────────────────────
// Fix 1: restrict CORS — same-origin in production (frontend served by this server),
// allow Vite dev server only in development.
const devOrigin = process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : false
app.use(cors({ origin: devOrigin, credentials: !!devOrigin }))
app.use(express.json())

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
        oui: c.oui ?? '',
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
      const ts = e.datetime ?? (e.time ? new Date(e.time * 1000).toISOString() : new Date().toISOString())
      const sub = e.subsystem ?? 'system'
      const msg = e.msg ?? e.key ?? ''

      // Classify severity
      let level = 'info'
      const msgLow = msg.toLowerCase()
      if (/critical|emerg|crit|exploit|rce|intrusion/i.test(msgLow)) level = 'critical'
      else if (/block|deny|drop|attack|brute|flood|scan|malware|threat/i.test(msgLow)) level = 'warning'
      else if (/error|fail|refused|reject/i.test(msgLow)) level = 'error'

      return {
        id: e._id,
        timestamp: ts,
        level,
        source: sub,
        message: msg,
        device: e.ap ?? e.user ?? '',
        ip: e.ip ?? '',
        dstIp: e.dst_ip ?? '',
        dstPort: e.dst_port,
        proto: e.proto ?? '',
        raw: e,
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

// ── Serve Vite build ──────────────────────────────────────────────────────────
const DIST = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))
} else {
  app.get('/', (_req, res) => res.json({ status: 'Unirule API running', note: 'Run npm run build for UI' }))
}

app.listen(PORT, () => {
  console.log(`[unirule] Server running on http://localhost:${PORT}`)
  console.log(`[unirule] UniFi configured: ${getUnifiConfig() !== null}`)
})
