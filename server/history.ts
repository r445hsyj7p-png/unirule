/**
 * History and settings API route handlers.
 * All routes are registered in server/index.ts under requireAuth middleware.
 */
import type express from 'express'
import { getDb, getSetting, getSettingInt, DB_PATH } from './db.js'
import fs from 'node:fs'

// ── Events history ────────────────────────────────────────────────────────────

export function handleHistoryEvents(req: express.Request, res: express.Response) {
  try {
    const db = getDb()
    const limit  = Math.min(parseInt(String(req.query.limit  ?? '200'),  10) || 200, 2000)
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'),    10) || 0,   0)
    const level  = typeof req.query.level  === 'string' && req.query.level  !== 'all' ? req.query.level  : null
    const search = typeof req.query.search === 'string' && req.query.search !== ''    ? req.query.search : null
    const from   = typeof req.query.from   === 'string' ? parseInt(req.query.from,   10) : null
    const to     = typeof req.query.to     === 'string' ? parseInt(req.query.to,     10) : null

    let sql = 'SELECT id, unifi_id, timestamp, level, source, message, device, ip, dst_ip, dst_port, proto FROM events WHERE 1=1'
    const params: (string | number)[] = []

    if (level)  { sql += ' AND level = ?';               params.push(level) }
    if (search) { sql += ' AND (message LIKE ? OR device LIKE ? OR ip LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    if (from)   { sql += ' AND timestamp >= ?';           params.push(from) }
    if (to)     { sql += ' AND timestamp <= ?';           params.push(to) }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const rows = db.prepare(sql).all(...params) as Array<{
      id: number; unifi_id: string | null; timestamp: number;
      level: string; source: string; message: string;
      device: string; ip: string; dst_ip: string;
      dst_port: number | null; proto: string;
    }>

    return res.json(rows.map(r => ({
      id:        String(r.id),
      timestamp: new Date(r.timestamp).toISOString(),
      level:     r.level,
      source:    r.source,
      message:   r.message,
      device:    r.device,
      ip:        r.ip,
      dstIp:     r.dst_ip,
      dstPort:   r.dst_port ?? undefined,
      proto:     r.proto,
      raw:       {},
    })))
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── Metrics history ───────────────────────────────────────────────────────────

export function handleHistoryMetrics(req: express.Request, res: express.Response) {
  try {
    const db = getDb()
    const now = Date.now()

    // Default: last 24 hours at minute resolution
    const from       = typeof req.query.from === 'string' ? parseInt(req.query.from, 10) : now - 24 * 3_600_000
    const to         = typeof req.query.to   === 'string' ? parseInt(req.query.to,   10) : now
    const resolution = typeof req.query.resolution === 'string' ? req.query.resolution : 'minute'

    // Bucket size in ms
    const bucketMs = resolution === 'hour' ? 3_600_000 : resolution === 'day' ? 86_400_000 : 60_000

    const rows = db.prepare(`
      SELECT
        (bucket / ?) * ? AS time_bucket,
        AVG(rx_bytes_per_sec) AS rx,
        AVG(tx_bytes_per_sec) AS tx,
        MAX(active_clients)   AS clients,
        MAX(active_devices)   AS devices,
        MAX(firewall_rules)   AS firewall
      FROM metrics
      WHERE bucket >= ? AND bucket <= ?
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `).all(bucketMs, bucketMs, from, to) as Array<{
      time_bucket: number; rx: number | null; tx: number | null;
      clients: number | null; devices: number | null; firewall: number | null;
    }>

    return res.json(rows.map(r => ({
      bucket:        r.time_bucket,
      time:          new Date(r.time_bucket).toISOString(),
      rxBytesPerSec: r.rx ?? 0,
      txBytesPerSec: r.tx ?? 0,
      activeClients: r.clients ?? 0,
      activeDevices: r.devices ?? 0,
      firewallRules: r.firewall ?? 0,
    })))
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function handleGetNotifications(req: express.Request, res: express.Response) {
  try {
    const db      = getDb()
    const unread  = req.query.unread === 'true'
    const limit   = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200)

    let sql = 'SELECT * FROM notifications'
    const params: (string | number)[] = []
    if (unread) { sql += ' WHERE read = 0'; }
    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const rows = db.prepare(sql).all(...params) as Array<{
      id: number; created_at: number; type: string; severity: string;
      title: string; message: string; entity_id: string | null;
      read: number; read_at: number | null;
    }>

    return res.json(rows.map(r => ({
      id:        r.id,
      createdAt: new Date(r.created_at).toISOString(),
      type:      r.type,
      severity:  r.severity,
      title:     r.title,
      message:   r.message,
      entityId:  r.entity_id,
      read:      r.read === 1,
      readAt:    r.read_at ? new Date(r.read_at).toISOString() : null,
    })))
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

export function handleMarkNotificationsRead(_req: express.Request, res: express.Response) {
  try {
    const db  = getDb()
    const now = Date.now()
    db.prepare('UPDATE notifications SET read = 1, read_at = ? WHERE read = 0').run(now)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── App settings ──────────────────────────────────────────────────────────────

export function handleGetSettings(_req: express.Request, res: express.Response) {
  try {
    const db   = getDb()
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    const out: Record<string, string> = {}
    for (const r of rows) out[r.key] = r.value
    return res.json(out)
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

export function handleUpdateSettings(req: express.Request, res: express.Response) {
  try {
    const db   = getDb()
    const body = req.body as Record<string, unknown>

    const allowed = ['events_retention_days', 'metrics_retention_days', 'snapshots_retention_days', 'anonymize_after_days']
    const upsert  = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    const now     = Date.now()

    db.transaction(() => {
      for (const key of allowed) {
        if (body[key] !== undefined) {
          const val = parseInt(String(body[key]), 10)
          if (!isNaN(val) && val >= 0) upsert.run(key, String(val), now)
        }
      }
    })()

    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── DB stats ──────────────────────────────────────────────────────────────────

export function handleDbStats(_req: express.Request, res: express.Response) {
  try {
    const db = getDb()

    const eventCount        = (db.prepare('SELECT COUNT(*) AS n FROM events').get()          as { n: number }).n
    const notifCount        = (db.prepare('SELECT COUNT(*) AS n FROM notifications').get()   as { n: number }).n
    const unreadCount       = (db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE read = 0').get() as { n: number }).n
    const metricsCount      = (db.prepare('SELECT COUNT(*) AS n FROM metrics').get()         as { n: number }).n
    const knownDeviceCount  = (db.prepare('SELECT COUNT(*) AS n FROM known_devices').get()   as { n: number }).n
    const auditCount        = (db.prepare('SELECT COUNT(*) AS n FROM audit_log').get()       as { n: number }).n

    // Oldest event
    const oldest = db.prepare('SELECT MIN(timestamp) AS t FROM events').get() as { t: number | null }

    // DB file size
    let fileSizeBytes = 0
    try { fileSizeBytes = fs.statSync(DB_PATH).size } catch { /* ignore */ }

    return res.json({
      eventCount,
      notifCount,
      unreadCount,
      metricsCount,
      knownDeviceCount,
      auditCount,
      fileSizeBytes,
      oldestEventAt: oldest.t ? new Date(oldest.t).toISOString() : null,
      settings: {
        eventsRetentionDays:    getSettingInt('events_retention_days',    30),
        metricsRetentionDays:   getSettingInt('metrics_retention_days',   90),
        snapshotsRetentionDays: getSettingInt('snapshots_retention_days', 14),
        anonymizeAfterDays:     getSettingInt('anonymize_after_days',      0),
      },
    })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── Audit log helper (called from index.ts) ────────────────────────────────────

export function writeAuditLog(opts: {
  action: string
  entityType: string
  entityId?: string
  entityName?: string
  oldValue?: string
  newValue?: string
  userIp?: string
}): void {
  try {
    getDb().prepare(`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, old_value, new_value, user_ip)
      VALUES (@action, @entity_type, @entity_id, @entity_name, @old_value, @new_value, @user_ip)
    `).run({
      action:       opts.action,
      entity_type:  opts.entityType,
      entity_id:    opts.entityId    ?? null,
      entity_name:  opts.entityName  ?? null,
      old_value:    opts.oldValue    ?? null,
      new_value:    opts.newValue    ?? null,
      user_ip:      opts.userIp      ?? '',
    })
  } catch { /* non-fatal */ }
}

// ── Known devices ─────────────────────────────────────────────────────────────

export function handleGetKnownDevices(req: express.Request, res: express.Response) {
  try {
    const db     = getDb()
    const limit  = Math.min(parseInt(String(req.query.limit  ?? '200'), 10) || 200, 1000)
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'),   10) || 0,   0)
    const search   = typeof req.query.search   === 'string' && req.query.search   !== '' ? req.query.search   : null
    const category = typeof req.query.category === 'string' && req.query.category !== '' ? req.query.category : null
    const trusted  = req.query.trusted === 'true' ? 1 : req.query.trusted === 'false' ? 0 : null

    let where = 'WHERE 1=1'
    const params: (string | number)[] = []
    if (search) {
      where += ' AND (name LIKE ? OR mac LIKE ? OR ip LIKE ? OR oui LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (category !== null) { where += ' AND category = ?'; params.push(category) }
    if (trusted  !== null) { where += ' AND trusted = ?';  params.push(trusted)  }

    const rows = db.prepare(
      `SELECT mac, name, ip, oui, category, trusted, flagged, notes, first_seen, last_seen, notified
       FROM known_devices ${where} ORDER BY last_seen DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<{
      mac: string; name: string; ip: string; oui: string; category: string
      trusted: number; flagged: number; notes: string | null
      first_seen: number; last_seen: number; notified: number
    }>

    const total = (db.prepare(
      `SELECT COUNT(*) AS n FROM known_devices ${where}`
    ).get(...params) as { n: number }).n

    return res.json({
      items: rows.map(r => ({
        mac:       r.mac,
        name:      r.name,
        ip:        r.ip,
        oui:       r.oui,
        category:  r.category,
        trusted:   r.trusted === 1,
        flagged:   r.flagged === 1,
        notes:     r.notes,
        firstSeen: new Date(r.first_seen).toISOString(),
        lastSeen:  new Date(r.last_seen).toISOString(),
        isNew:     (Date.now() - r.first_seen) < 24 * 3_600_000,
      })),
      total,
    })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

export function handleUpdateKnownDevice(req: express.Request, res: express.Response) {
  try {
    const db  = getDb()
    const mac = String((req.params as Record<string, string>).mac ?? '')
      .toLowerCase()
      .replace(/-/g, ':')   // normalise hyphen separators to colons (UniFi stores colons)
    if (!mac) return res.status(400).json({ error: 'mac required' })

    const body    = req.body as Record<string, unknown>
    const allowed: Record<string, string | number | null> = {}
    if (body.name     !== undefined) allowed['name']     = String(body.name     ?? '').slice(0, 100)
    if (body.notes    !== undefined) allowed['notes']    = body.notes === null ? null : String(body.notes).slice(0, 500)
    if (body.trusted  !== undefined) allowed['trusted']  = body.trusted  ? 1 : 0
    if (body.flagged  !== undefined) allowed['flagged']  = body.flagged  ? 1 : 0
    if (body.category !== undefined) allowed['category'] = String(body.category ?? '').slice(0, 50)

    if (Object.keys(allowed).length === 0) return res.status(400).json({ error: 'No valid fields' })

    // Hard allowlist — prevents SQL injection if the guard above is ever loosened
    const SAFE_COLS = new Set(['name', 'notes', 'trusted', 'flagged', 'category'])
    for (const k of Object.keys(allowed)) {
      if (!SAFE_COLS.has(k)) return res.status(400).json({ error: `Invalid field: ${k}` })
    }

    const sets   = Object.keys(allowed).map(k => `${k} = ?`).join(', ')
    const values = Object.values(allowed)
    const result = db.prepare(`UPDATE known_devices SET ${sets} WHERE mac = ?`).run(...values, mac)
    if (result.changes === 0) return res.status(404).json({ error: 'Device not found' })

    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── Audit log viewer ──────────────────────────────────────────────────────────

export function handleGetAuditLog(req: express.Request, res: express.Response) {
  try {
    const db     = getDb()
    const limit  = Math.min(parseInt(String(req.query.limit  ?? '100'), 10) || 100, 500)
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'),   10) || 0,   0)
    const from   = typeof req.query.from   === 'string' ? parseInt(req.query.from,   10) : null
    const to     = typeof req.query.to     === 'string' ? parseInt(req.query.to,     10) : null
    const action = typeof req.query.action === 'string' && req.query.action !== '' ? req.query.action : null

    let where = 'WHERE 1=1'
    const params: (string | number)[] = []
    if (from   !== null) { where += ' AND timestamp >= ?'; params.push(from)   }
    if (to     !== null) { where += ' AND timestamp <= ?'; params.push(to)     }
    if (action !== null) { where += ' AND action = ?';     params.push(action) }

    const rows = db.prepare(
      `SELECT id, timestamp, action, entity_type, entity_id, entity_name, old_value, new_value, user_ip
       FROM audit_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<{
      id: number; timestamp: number; action: string; entity_type: string
      entity_id: string | null; entity_name: string | null
      old_value: string | null; new_value: string | null; user_ip: string
    }>

    const total = (db.prepare(
      `SELECT COUNT(*) AS n FROM audit_log ${where}`
    ).get(...params) as { n: number }).n

    return res.json({
      items: rows.map(r => ({
        id:         r.id,
        timestamp:  new Date(r.timestamp).toISOString(),
        action:     r.action,
        entityType: r.entity_type,
        entityId:   r.entity_id,
        entityName: r.entity_name,
        oldValue:   r.old_value,
        newValue:   r.new_value,
        userIp:     r.user_ip,
      })),
      total,
    })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── Data purge ────────────────────────────────────────────────────────────────

export function handlePurgeData(_req: express.Request, res: express.Response) {
  try {
    const db  = getDb()
    const now = Date.now()

    const eventsMs    = getSettingInt('events_retention_days',    30) * 86_400_000
    const metricsMs   = getSettingInt('metrics_retention_days',   90) * 86_400_000
    const snapshotsMs = getSettingInt('snapshots_retention_days', 14) * 86_400_000

    const { eventsDeleted, metricsDeleted, clientSnapsDeleted, deviceSnapsDeleted, notifDeleted } =
      db.transaction(() => ({
        eventsDeleted:      db.prepare('DELETE FROM events           WHERE timestamp   < ?').run(now - eventsMs   ).changes,
        metricsDeleted:     db.prepare('DELETE FROM metrics           WHERE bucket      < ?').run(now - metricsMs  ).changes,
        clientSnapsDeleted: db.prepare('DELETE FROM client_snapshots  WHERE captured_at < ?').run(now - snapshotsMs).changes,
        deviceSnapsDeleted: db.prepare('DELETE FROM device_snapshots  WHERE captured_at < ?').run(now - snapshotsMs).changes,
        notifDeleted:       db.prepare('DELETE FROM notifications WHERE read = 1 AND created_at < ?').run(now - 7 * 86_400_000).changes,
      }))()

    db.pragma('wal_checkpoint(TRUNCATE)')

    writeAuditLog({
      action:     'purge',
      entityType: 'database',
      newValue:   JSON.stringify({ eventsDeleted, metricsDeleted, clientSnapsDeleted, deviceSnapsDeleted, notifDeleted }),
    })

    return res.json({ eventsDeleted, metricsDeleted, clientSnapsDeleted, deviceSnapsDeleted, notifDeleted })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function handleExportEventsCsv(req: express.Request, res: express.Response) {
  try {
    const db     = getDb()
    const limit  = Math.min(parseInt(String(req.query.limit ?? '10000'), 10) || 10000, 50000)
    const level  = typeof req.query.level  === 'string' && req.query.level  !== 'all' ? req.query.level  : null
    const search = typeof req.query.search === 'string' && req.query.search !== ''    ? req.query.search : null
    const from   = typeof req.query.from   === 'string' ? parseInt(req.query.from,   10) : null
    const to     = typeof req.query.to     === 'string' ? parseInt(req.query.to,     10) : null

    let sql = 'SELECT timestamp, level, source, device, ip, dst_ip, dst_port, proto, message FROM events WHERE 1=1'
    const params: (string | number)[] = []
    if (level)  { sql += ' AND level = ?';  params.push(level) }
    if (search) { sql += ' AND (message LIKE ? OR device LIKE ? OR ip LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    if (from !== null) { sql += ' AND timestamp >= ?'; params.push(from) }
    if (to   !== null) { sql += ' AND timestamp <= ?'; params.push(to)   }
    sql += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(limit)

    const rows = db.prepare(sql).all(...params) as Array<{
      timestamp: number; level: string; source: string; device: string
      ip: string; dst_ip: string; dst_port: number | null; proto: string; message: string
    }>

    const escape = (v: string | number | null | undefined): string => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }

    const header = 'timestamp,level,source,device,ip,dst_ip,dst_port,proto,message\n'
    const body   = rows.map(r => [
      new Date(r.timestamp).toISOString(),
      escape(r.level), escape(r.source), escape(r.device),
      escape(r.ip), escape(r.dst_ip),
      r.dst_port ?? '',
      escape(r.proto), escape(r.message),
    ].join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="unirule-events.csv"')
    return res.send(header + body)
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
