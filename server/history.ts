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
