/**
 * Syslog receiver — listens on UDP (default) or TCP.
 *
 * UniFi devices send RFC 3164 syslog messages:
 *   <PRI>Mon DD HH:MM:SS hostname process[pid]: message body
 *
 * Messages are normalised and inserted into the events table using the
 * same schema as the REST-API ingestion path so they show up in the
 * Log Explorer and threat engine automatically.
 *
 * Usage:
 *   await startSyslog(514, 'udp')   // start
 *   stopSyslog()                    // stop
 *   getSyslogStatus()               // current state
 */
import crypto from 'node:crypto'
import dgram from 'node:dgram'
import net from 'node:net'
import { getDb } from './db.js'
import { classifyLevel } from './event-normalize.js'

// ── Public types ──────────────────────────────────────────────────────────────

export interface SyslogStatus {
  running:       boolean
  port:          number
  proto:         string
  receivedCount: number
  startedAt:     number | null
  error:         string | null
}

// ── Module state ──────────────────────────────────────────────────────────────

let udpSock: dgram.Socket | null = null
let tcpSrv:  net.Server   | null = null
let _status: SyslogStatus = {
  running: false, port: 514, proto: 'udp',
  receivedCount: 0, startedAt: null, error: null,
}

// Maximum per-connection TCP buffer before dropping the connection
const TCP_MAX_BUF = 64 * 1024

// ── RFC 3164 parser ───────────────────────────────────────────────────────────

interface Parsed {
  pri:       number
  hostname:  string
  tag:       string
  message:   string
  timestamp: number
}

function parseSyslog(raw: string): Parsed | null {
  // <PRI>MMM DD HH:MM:SS hostname tag[pid]: message
  const m = raw.match(
    /^<(\d{1,3})>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^\s:]+):\s*(.*)$/,
  )
  if (!m) return null
  const [, priStr, dateStr, hostname, tag, message] = m
  const year = new Date().getFullYear()
  // Normalise double-space padding (e.g. "Jan  5") before parsing
  const ts = new Date(`${dateStr.replace(/\s+/g, ' ')} ${year}`).getTime()
  return {
    pri:       parseInt(priStr, 10),
    hostname,
    tag,
    message,
    timestamp: Number.isNaN(ts) ? Date.now() : ts,
  }
}

function priToLevel(pri: number): string {
  const sev = pri & 0x7   // low 3 bits = RFC 3164 severity
  if (sev <= 1) return 'critical'
  if (sev <= 3) return 'error'
  if (sev === 4) return 'warning'
  return 'info'
}

// ── Persist one syslog message ────────────────────────────────────────────────

function store(raw: string, remoteAddr: string): void {
  const text    = raw.trim()
  if (!text) return
  const parsed  = parseSyslog(text)
  const message = (parsed?.message ?? text).slice(0, 500)
  const level   = parsed ? priToLevel(parsed.pri) : classifyLevel(message)
  const ts      = parsed?.timestamp ?? Date.now()

  // Deterministic dedup key from content — prevents duplicates from UDP retransmits
  // (events.unifi_id has a UNIQUE constraint; NULL bypasses it so we must supply a value)
  const syslogId = 'syslog:' + crypto.createHash('sha1')
    .update(`${remoteAddr}\0${ts}\0${message}`)
    .digest('hex')
    .slice(0, 24)

  try {
    getDb().prepare(`
      INSERT OR IGNORE INTO events
        (unifi_id, timestamp, level, source, message, device, ip, dst_ip, dst_port, proto, raw)
      VALUES
        (?, ?, ?, 'syslog', ?, ?, ?, NULL, NULL, NULL, ?)
    `).run(
      syslogId,
      ts,
      level,
      message,
      parsed?.hostname ?? remoteAddr,
      remoteAddr,
      JSON.stringify({ syslogRaw: text, remote: remoteAddr }),
    )
    _status.receivedCount++
  } catch (err) {
    console.warn('[syslog] store error:', err instanceof Error ? err.message : String(err))
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

export function startSyslog(port: number, proto: 'udp' | 'tcp'): Promise<void> {
  return new Promise((resolve, reject) => {
    stopSyslog()   // ensure no stale listeners

    if (proto === 'udp') {
      const sock = dgram.createSocket('udp4')

      // Single error handler with a 'settled' flag so it correctly handles both
      // pre-bind errors (reject + close) and post-bind runtime errors (update status).
      let settled = false
      sock.on('error', err => {
        console.error('[syslog] UDP error:', err.message)
        _status = { ..._status, running: false, error: err.message }
        if (!settled) {
          settled = true
          try { sock.close() } catch { /* ignore */ }
          reject(err)
        }
      })

      sock.on('message', (msg, rinfo) => store(msg.toString(), rinfo.address))

      sock.bind(port, () => {
        settled = true
        udpSock = sock
        _status = { running: true, port, proto: 'udp', receivedCount: 0, startedAt: Date.now(), error: null }
        console.log(`[syslog] UDP listening on :${port}`)
        resolve()
      })
    } else {
      // TCP — newline-delimited framing (RFC 3164 over TCP)
      const srv = net.createServer(socket => {
        const remote = socket.remoteAddress ?? ''
        let buf = ''
        socket.setEncoding('utf8')
        socket.on('data', chunk => {
          buf += chunk
          // Guard against unbounded buffer growth from misbehaving / malicious clients
          if (buf.length > TCP_MAX_BUF) {
            socket.destroy()
            return
          }
          let nl: number
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl)
            buf = buf.slice(nl + 1)
            if (line.trim()) store(line, remote)
          }
        })
        socket.on('error', () => { /* ignore individual connection errors */ })
      })

      let settled = false
      srv.on('error', err => {
        console.error('[syslog] TCP error:', err.message)
        _status = { ..._status, running: false, error: err.message }
        if (!settled) {
          settled = true
          reject(err)
        }
      })

      srv.listen(port, () => {
        settled = true
        tcpSrv  = srv
        _status = { running: true, port, proto: 'tcp', receivedCount: 0, startedAt: Date.now(), error: null }
        console.log(`[syslog] TCP listening on :${port}`)
        resolve()
      })
    }
  })
}

// ── Stop ──────────────────────────────────────────────────────────────────────

export function stopSyslog(): void {
  if (udpSock) { try { udpSock.close() } catch { /* already closed */ } }
  if (tcpSrv)  { try { tcpSrv.close()  } catch { /* already closed */ } }
  udpSock = null
  tcpSrv  = null
  _status = { ..._status, running: false, startedAt: null }
}

// ── Status ────────────────────────────────────────────────────────────────────

export function getSyslogStatus(): SyslogStatus {
  return { ..._status }
}
