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
}

// ── Response types (matches server normalisation) ─────────────────────────────

export interface UnifiDeviceRow {
  id: string; name: string; mac: string; ip: string; model: string
  type: string; version: string; status: 'online' | 'offline'
  lastSeen: string | null; clients: number; uptime: number
}

export interface UnifiClientRow {
  id: string; name: string; mac: string; ip: string; zone: string
  vlan?: number; status: 'online' | 'offline'; lastSeen: string | null
  uptime: number; rxBytes: number; txBytes: number; signal?: number; oui: string
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
