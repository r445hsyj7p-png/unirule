/**
 * Frontend API client
 * All requests go to /api/* which the backend proxies to UniFi.
 */
import { useConnectionStore } from '@/lib/store'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // always send the HttpOnly session cookie
    ...options,
  })
  const body = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) {
    // Fix 6: if the server lost its in-memory config (e.g. restart without volume),
    // clear the persisted "configured" flag so the UI shows the reconnect prompt.
    if (res.status === 503 && body.error === 'NOT_CONFIGURED') {
      useConnectionStore.getState().setDisconnected()
    }
    throw new ApiError(res.status, body.message ?? body.error ?? res.statusText)
  }
  return body as T
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface UnifiConfigPayload {
  url: string
  username: string
  password: string
  site: string
  verifySsl: boolean
}

export const api = {
  getConfig: () => request<{ configured: boolean; url?: string; username?: string; site?: string }>('/api/config'),
  saveConfig: (cfg: UnifiConfigPayload) => request<{ ok: boolean; site?: string; version?: string }>('/api/config', { method: 'POST', body: JSON.stringify(cfg) }),
  testConfig:  (cfg: UnifiConfigPayload) => request<{ ok: boolean; siteName?: string; version?: string }>('/api/config/test', { method: 'POST', body: JSON.stringify(cfg) }),
  deleteConfig: () => request<{ ok: boolean }>('/api/config', { method: 'DELETE' }),

  // ── UniFi data ───────────────────────────────────────────────────────────
  getDevices:  () => request<UnifiDeviceRow[]>('/api/unifi/devices'),
  getClients:  () => request<UnifiClientRow[]>('/api/unifi/clients'),
  getEvents:   (limit = 500) => request<UnifiLogRow[]>(`/api/unifi/events?limit=${limit}`),
  getFirewall: () => request<UnifiRuleRow[]>('/api/unifi/firewall'),
  getNetworks: () => request<UnifiNetworkRow[]>('/api/unifi/networks'),
  getHealth:   () => request<UnifiHealthRow[]>('/api/unifi/health'),
  getAlarms:   () => request<unknown[]>('/api/unifi/alarms'),

  toggleFirewallRule: (id: string, enabled: boolean) =>
    request<UnifiRuleRow>(`/api/unifi/firewall/${id}`, {
      method: 'PATCH', body: JSON.stringify({ enabled }),
    }),

  simulatePacket: (params: SimulateParams) =>
    request<SimulationResult>('/api/simulate/packet', {
      method: 'POST', body: JSON.stringify(params),
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST', body: JSON.stringify({ oldPassword, newPassword }),
    }),

  getBlockedIps: () =>
    request<Array<{ ip: string; lockedAt: number; lockedUntil: number }>>('/api/auth/blocked-ips'),

  // ── History (SQLite-backed) ──────────────────────────────────────────────
  getHistoryEvents: (params?: {
    limit?: number; offset?: number; level?: string
    search?: string; from?: number; to?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.limit  !== undefined) q.set('limit',  String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    if (params?.level  && params.level !== 'all') q.set('level',  params.level)
    if (params?.search && params.search !== '')   q.set('search', params.search)
    if (params?.from   !== undefined) q.set('from',   String(params.from))
    if (params?.to     !== undefined) q.set('to',     String(params.to))
    return request<UnifiLogRow[]>(`/api/history/events?${q}`)
  },

  getHistoryMetrics: (params?: {
    from?: number; to?: number; resolution?: 'minute' | 'hour' | 'day'
  }) => {
    const q = new URLSearchParams()
    if (params?.from !== undefined) q.set('from', String(params.from))
    if (params?.to   !== undefined) q.set('to',   String(params.to))
    if (params?.resolution) q.set('resolution', params.resolution)
    return request<MetricsBucket[]>(`/api/history/metrics?${q}`)
  },

  getNotifications: (unreadOnly = false) =>
    request<AppNotification[]>(`/api/history/notifications${unreadOnly ? '?unread=true' : ''}`),

  markNotificationsRead: () =>
    request<{ ok: boolean }>('/api/history/notifications/read-all', { method: 'POST' }),

  getAppSettings: () =>
    request<AppSettings>('/api/settings'),

  updateAppSettings: (settings: Partial<AppSettings>) =>
    request<{ ok: boolean }>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  getDbStats: () =>
    request<DbStats>('/api/history/stats'),

  // ── Phase 3 ──────────────────────────────────────────────────────────────────
  getKnownDevices: (params?: {
    search?: string; limit?: number; offset?: number
    trusted?: boolean; category?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.limit    !== undefined) q.set('limit',    String(params.limit))
    if (params?.offset   !== undefined) q.set('offset',   String(params.offset))
    if (params?.search)                 q.set('search',   params.search)
    if (params?.category)               q.set('category', params.category)
    if (params?.trusted  !== undefined) q.set('trusted',  String(params.trusted))
    return request<KnownDevicesResponse>(`/api/devices/known?${q}`)
  },

  updateKnownDevice: (
    mac: string,
    patch: Partial<Pick<KnownDevice, 'name' | 'notes' | 'trusted' | 'flagged' | 'category'>>
  ) =>
    request<{ ok: boolean }>(`/api/devices/known/${encodeURIComponent(mac)}`, {
      method: 'PATCH', body: JSON.stringify(patch),
    }),

  getAuditLog: (params?: {
    limit?: number; offset?: number; from?: number; to?: number; action?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.limit  !== undefined) q.set('limit',  String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    if (params?.from   !== undefined) q.set('from',   String(params.from))
    if (params?.to     !== undefined) q.set('to',     String(params.to))
    if (params?.action)               q.set('action', params.action)
    return request<AuditLogResponse>(`/api/history/audit?${q}`)
  },

  purgeData: () =>
    request<PurgeResult>('/api/history/purge', { method: 'POST' }),

  /** Returns a URL (not a Promise) — use as anchor href or window.location */
  exportEventsCsvUrl: (params?: {
    level?: string; search?: string; from?: number; to?: number
  }): string => {
    const q = new URLSearchParams()
    if (params?.level  && params.level  !== 'all') q.set('level',  params.level)
    if (params?.search && params.search !== '')    q.set('search', params.search)
    if (params?.from   !== undefined) q.set('from', String(params.from))
    if (params?.to     !== undefined) q.set('to',   String(params.to))
    return `/api/history/events/export?${q}`
  },
}

// ── Phase 3 types ─────────────────────────────────────────────────────────────

export interface KnownDevice {
  mac:       string
  name:      string
  ip:        string
  oui:       string
  category:  string
  trusted:   boolean
  flagged:   boolean
  notes:     string | null
  firstSeen: string
  lastSeen:  string
  isNew:     boolean
}

export interface KnownDevicesResponse {
  items: KnownDevice[]
  total: number
}

export interface AuditLogEntry {
  id:         number
  timestamp:  string
  action:     string
  entityType: string
  entityId:   string | null
  entityName: string | null
  oldValue:   string | null
  newValue:   string | null
  userIp:     string
}

export interface AuditLogResponse {
  items: AuditLogEntry[]
  total: number
}

export interface PurgeResult {
  eventsDeleted:       number
  metricsDeleted:      number
  clientSnapsDeleted:  number
  deviceSnapsDeleted:  number
  notifDeleted:        number
}

// ── Response types (matches server normalisation) ─────────────────────────────

export interface UnifiDeviceRow {
  id: string; name: string; mac: string; ip: string; model: string
  type: string; version: string; status: 'online' | 'offline'
  lastSeen: string | null; clients: number; uptime: number
}

export type DeviceCategory = 'gateway' | 'switch' | 'ap' | 'user' | 'mobile' | 'iot' | 'camera' | 'printer' | 'server' | 'voip' | 'unknown'

export interface UnifiClientRow {
  id: string; name: string; mac: string; ip: string; zone: string
  vlan?: number; status: 'online' | 'offline'; lastSeen: string | null
  uptime: number; rxBytes: number; txBytes: number; signal?: number
  oui: string           // manufacturer name (enriched via OUI DB)
  category: DeviceCategory
}

export interface UnifiLogRow {
  id: string; timestamp: string; level: string; source: string
  message: string; device: string; ip: string; dstIp: string
  dstPort?: number; proto: string; raw: unknown
}

export interface UnifiRuleRow {
  id: string; name: string; enabled: boolean; action: string; protocol: string
  srcAddress: string; dstAddress: string; srcPort: string; dstPort: string; ruleset: string
}

export interface UnifiNetworkRow {
  id: string; name: string; purpose: string; vlan?: number
  cidr: string; gateway: string; enabled: boolean; devices: number
}

export interface UnifiHealthRow {
  subsystem: string; status: string; num_user?: number
  tx_bytes_r?: number; rx_bytes_r?: number
}

// ── History / Settings types ──────────────────────────────────────────────────

export interface MetricsBucket {
  bucket:        number
  time:          string
  rxBytesPerSec: number
  txBytesPerSec: number
  activeClients: number
  activeDevices: number
  firewallRules: number
}

export interface AppNotification {
  id:        number
  createdAt: string
  type:      string
  severity:  string
  title:     string
  message:   string
  entityId:  string | null
  read:      boolean
  readAt:    string | null
}

export interface AppSettings {
  events_retention_days:    string
  metrics_retention_days:   string
  snapshots_retention_days: string
  anonymize_after_days:     string
}

export interface DbStats {
  eventCount:       number
  notifCount:       number
  unreadCount:      number
  metricsCount:     number
  knownDeviceCount: number
  auditCount:       number
  fileSizeBytes:    number
  oldestEventAt:    string | null
  settings: {
    eventsRetentionDays:    number
    metricsRetentionDays:   number
    snapshotsRetentionDays: number
    anonymizeAfterDays:     number
  }
}

// ── Simulation types ──────────────────────────────────────────────────────────

export interface SimulateParams {
  srcIp: string
  dstIp: string
  dstPort?: number
  proto?: 'tcp' | 'udp' | 'icmp' | 'all'
  hypotheticalRules?: Array<{ id: string; enabled?: boolean }>
}

export interface TraceEntry {
  ruleId: string
  ruleName: string
  isImplicit: boolean
  implicitSource?: string
  action: 'match' | 'skip' | 'skip-disabled'
  skipReason?: string
}

export interface SimulationResult {
  verdict: 'ALLOW' | 'DROP' | 'REJECT' | 'UNCERTAIN'
  matchedRule: { id: string; name: string; isImplicit: boolean; implicitSource?: string } | null
  trace: TraceEntry[]
  defaultAction: 'DROP'
  caveats: string[]
}
