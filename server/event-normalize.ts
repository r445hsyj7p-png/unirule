/**
 * Shared UniFi event normalization — used by both the live /api/unifi/events
 * endpoint and the background ingestion job so level classification stays in sync.
 */
import type { UnifiEvent } from './unifi-client.js'

export interface NormalizedEvent {
  timestamp: number
  level:     string
  source:    string
  message:   string
  device:    string
  ip:        string
  dstIp:     string
  dstPort:   number | undefined
  proto:     string
}

export function classifyLevel(msg: string): string {
  if (/critical|emerg|crit|exploit|rce|intrusion/i.test(msg)) return 'critical'
  if (/block|deny|drop|attack|brute|flood|scan|malware|threat/i.test(msg)) return 'warning'
  if (/error|fail|refused|reject/i.test(msg)) return 'error'
  return 'info'
}

export function normalizeEvent(e: UnifiEvent): NormalizedEvent & { level: string } {
  const ts  = e.datetime
    ? new Date(e.datetime).getTime()
    : (e.time ? e.time * 1000 : Date.now())
  const msg = e.msg ?? e.key ?? ''
  return {
    timestamp: ts,
    level:     classifyLevel(msg),
    source:    e.subsystem ?? 'system',
    message:   msg,
    device:    e.ap ?? e.user ?? '',
    ip:        e.ip ?? '',
    dstIp:     e.dst_ip ?? '',
    dstPort:   e.dst_port,
    proto:     e.proto ?? '',
  }
}
