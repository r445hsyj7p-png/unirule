/**
 * Background ingestion jobs:
 *   • EventIngester    — 30 s  — fetch latest UniFi events → events table
 *   • ClientSnapshotter— 5 min — snapshot clients + detect new devices
 *   • DeviceSnapshotter— 5 min — snapshot infrastructure devices
 *   • MetricsIngester  — 1 min — capture 1-min bandwidth/client metrics
 *
 * Every job is wrapped in runSafe() to prevent one failure from killing
 * all other jobs or crashing the server process.
 */
import { getDb, getSettingInt } from './db.js'
import { getUnifiClient, type UnifiClient as UClient, type UnifiDevice, type UnifiEvent } from './unifi-client.js'

const intervals: ReturnType<typeof setInterval>[] = []
let running = false

export function startIngestion(): void {
  if (running) return
  running = true
  console.log('[ingestion] Background jobs starting…')

  // Kick off immediately, then repeat
  void runSafe(ingestEvents,    'EventIngester')
  void runSafe(snapshotClients, 'ClientSnapshotter')
  void runSafe(snapshotDevices, 'DeviceSnapshotter')
  void runSafe(ingestMetrics,   'MetricsIngester')

  intervals.push(setInterval(() => void runSafe(ingestEvents,    'EventIngester'),    30_000))
  intervals.push(setInterval(() => void runSafe(snapshotClients, 'ClientSnapshotter'), 5 * 60_000))
  intervals.push(setInterval(() => void runSafe(snapshotDevices, 'DeviceSnapshotter'), 5 * 60_000))
  intervals.push(setInterval(() => void runSafe(ingestMetrics,   'MetricsIngester'),  60_000))
}

export function stopIngestion(): void {
  intervals.forEach(clearInterval)
  intervals.length = 0
  running = false
}

async function runSafe(fn: () => Promise<void>, name: string): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.warn(`[ingestion] ${name} error:`, err instanceof Error ? err.message : String(err))
  }
}

// ── Event ingestion ───────────────────────────────────────────────────────────

async function ingestEvents(): Promise<void> {
  const client = getUnifiClient()
  const db = getDb()

  const raw = await client.getEvents(200)

  const insert = db.prepare(`
    INSERT OR IGNORE INTO events
      (unifi_id, timestamp, level, source, message, device, ip, dst_ip, dst_port, proto, raw)
    VALUES
      (@unifi_id, @timestamp, @level, @source, @message, @device, @ip, @dst_ip, @dst_port, @proto, @raw)
  `)

  const newCount = db.transaction((evts: UnifiEvent[]) => {
    let n = 0
    for (const e of evts) {
      const ts  = e.datetime
        ? new Date(e.datetime).getTime()
        : (e.time ? e.time * 1000 : Date.now())
      const msg = e.msg ?? e.key ?? ''
      let level = 'info'
      if (/critical|emerg|crit|exploit|rce|intrusion/i.test(msg)) level = 'critical'
      else if (/block|deny|drop|attack|brute|flood|scan|malware|threat/i.test(msg)) level = 'warning'
      else if (/error|fail|refused|reject/i.test(msg)) level = 'error'

      const r = insert.run({
        unifi_id: e._id ?? null,
        timestamp: ts,
        level,
        source:   e.subsystem ?? 'system',
        message:  msg,
        device:   e.ap ?? e.user ?? '',
        ip:       e.ip ?? '',
        dst_ip:   e.dst_ip ?? '',
        dst_port: e.dst_port ?? null,
        proto:    e.proto ?? '',
        raw:      JSON.stringify(e),
      })
      if (r.changes > 0) n++
    }
    return n
  })(raw)

  if (newCount > 0) console.log(`[ingestion] ${newCount} new events stored`)

  // Prune old events
  const cutoff = Date.now() - getSettingInt('events_retention_days', 30) * 86_400_000
  db.prepare('DELETE FROM events WHERE timestamp < ?').run(cutoff)
}

// ── Client snapshots + new-device detection ───────────────────────────────────

async function snapshotClients(): Promise<void> {
  const client = getUnifiClient()
  const db = getDb()
  const now = Date.now()

  const active = await client.getClients()

  const upsertKnown = db.prepare(`
    INSERT INTO known_devices (mac, first_seen, last_seen, name, ip, oui, category, notified)
    VALUES (@mac, @first_seen, @last_seen, @name, @ip, @oui, @category, 0)
    ON CONFLICT(mac) DO UPDATE SET
      last_seen = excluded.last_seen,
      name      = COALESCE(excluded.name, known_devices.name),
      ip        = excluded.ip
  `)
  const getKnown   = db.prepare('SELECT notified FROM known_devices WHERE mac = ?')
  const setNotified = db.prepare('UPDATE known_devices SET notified = 1 WHERE mac = ?')
  const insertNotif = db.prepare(`
    INSERT INTO notifications (type, severity, title, message, entity_id)
    VALUES (@type, @severity, @title, @message, @entity_id)
  `)
  const insertSnap = db.prepare(`
    INSERT INTO client_snapshots
      (captured_at, mac, name, ip, zone, vlan, status, rx_bytes, tx_bytes, signal, oui, category)
    VALUES
      (@captured_at, @mac, @name, @ip, @zone, @vlan, @status, @rx_bytes, @tx_bytes, @signal, @oui, @category)
  `)

  db.transaction(() => {
    for (const c of active as UClient[]) {
      const existing = getKnown.get(c.mac) as { notified: number } | undefined

      upsertKnown.run({
        mac:        c.mac,
        first_seen: now,
        last_seen:  now,
        name:       c.hostname ?? c.mac,
        ip:         c.ip ?? '',
        oui:        c.oui ?? '',
        category:   'unknown',
      })

      // Fire notification only the very first time
      if (!existing) {
        insertNotif.run({
          type:      'new_device',
          severity:  'info',
          title:     'Neues Gerät erkannt',
          message:   `${c.hostname ?? c.mac} (${c.ip ?? 'keine IP'}) wurde im Netzwerk entdeckt.`,
          entity_id: c.mac,
        })
        setNotified.run(c.mac)
      }

      insertSnap.run({
        captured_at: now,
        mac:         c.mac,
        name:        c.hostname ?? c.mac,
        ip:          c.ip ?? '',
        zone:        c.network ?? '',
        vlan:        c.vlan ?? null,
        status:      'online',
        rx_bytes:    c.rx_bytes ?? 0,
        tx_bytes:    c.tx_bytes ?? 0,
        signal:      c.signal ?? null,
        oui:         c.oui ?? '',
        category:    'unknown',
      })
    }
  })()

  const cutoff = Date.now() - getSettingInt('snapshots_retention_days', 14) * 86_400_000
  db.prepare('DELETE FROM client_snapshots WHERE captured_at < ?').run(cutoff)
}

// ── Device snapshots ──────────────────────────────────────────────────────────

async function snapshotDevices(): Promise<void> {
  const client = getUnifiClient()
  const db = getDb()
  const now = Date.now()

  const devices = await client.getDevices()

  const insert = db.prepare(`
    INSERT INTO device_snapshots (captured_at, mac, name, ip, model, type, status, clients, uptime)
    VALUES (@captured_at, @mac, @name, @ip, @model, @type, @status, @clients, @uptime)
  `)

  db.transaction(() => {
    for (const d of devices as UnifiDevice[]) {
      insert.run({
        captured_at: now,
        mac:     d.mac,
        name:    d.name ?? d.mac,
        ip:      d.ip ?? '',
        model:   d.model ?? '',
        type:    d.type,
        status:  d.state === 1 ? 'online' : 'offline',
        clients: d.num_sta ?? 0,
        uptime:  d.uptime ?? 0,
      })
    }
  })()

  const cutoff = Date.now() - getSettingInt('snapshots_retention_days', 14) * 86_400_000
  db.prepare('DELETE FROM device_snapshots WHERE captured_at < ?').run(cutoff)
}

// ── Metrics ingestion ─────────────────────────────────────────────────────────

async function ingestMetrics(): Promise<void> {
  const client = getUnifiClient()
  const db = getDb()

  const [healthRes, clientsRes, devicesRes, firewallRes] = await Promise.allSettled([
    client.getHealth(),
    client.getClients(),
    client.getDevices(),
    client.getFirewallRules(),
  ])

  const healthData   = healthRes.status   === 'fulfilled' ? healthRes.value   : []
  const clientData   = clientsRes.status  === 'fulfilled' ? clientsRes.value  : []
  const deviceData   = devicesRes.status  === 'fulfilled' ? devicesRes.value  : []
  const firewallData = firewallRes.status === 'fulfilled' ? firewallRes.value : []

  const wanHealth = healthData.find((h: { subsystem: string }) => h.subsystem === 'wan') as { status?: string } | undefined
  const rxRate    = healthData.reduce((s: number, h: { rx_bytes_r?: number }) => s + (h.rx_bytes_r ?? 0), 0)
  const txRate    = healthData.reduce((s: number, h: { tx_bytes_r?: number }) => s + (h.tx_bytes_r ?? 0), 0)

  const bucket = Math.floor(Date.now() / 60_000) * 60_000

  db.prepare(`
    INSERT INTO metrics
      (bucket, rx_bytes_per_sec, tx_bytes_per_sec, active_clients, active_devices, firewall_rules, wan_status)
    VALUES
      (@bucket, @rx, @tx, @clients, @devices, @firewall, @wan)
    ON CONFLICT(bucket) DO UPDATE SET
      rx_bytes_per_sec = excluded.rx_bytes_per_sec,
      tx_bytes_per_sec = excluded.tx_bytes_per_sec,
      active_clients   = excluded.active_clients,
      active_devices   = excluded.active_devices,
      firewall_rules   = excluded.firewall_rules,
      wan_status       = excluded.wan_status
  `).run({
    bucket,
    rx:       rxRate,
    tx:       txRate,
    clients:  clientData.length,
    devices:  deviceData.length,
    firewall: firewallData.length,
    wan:      wanHealth?.status ?? 'unknown',
  })

  const cutoff = Date.now() - getSettingInt('metrics_retention_days', 90) * 86_400_000
  db.prepare('DELETE FROM metrics WHERE bucket < ?').run(cutoff)
}
