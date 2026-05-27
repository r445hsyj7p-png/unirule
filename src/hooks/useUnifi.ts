/**
 * TanStack Query hooks — all UniFi data fetching lives here.
 * When not configured → returns { notConfigured: true }.
 */
import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { useConnectionStore } from '@/lib/store'

const REFETCH_INTERVAL = 30_000   // 30 s live refresh
const STALE_TIME      =  5_000   // 5 s

function useConfigured() {
  return useConnectionStore(s => s.configured)
}

// ── Config / status ───────────────────────────────────────────────────────────

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
    staleTime: 60_000,
    retry: false,
  })
}

// ── Infrastructure devices (APs, switches, gateways) ─────────────────────────

export function useDevices() {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['unifi', 'devices'],
    queryFn: api.getDevices,
    enabled: ok,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Clients (end devices) ─────────────────────────────────────────────────────

export function useClients() {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['unifi', 'clients'],
    queryFn: api.getClients,
    enabled: ok,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Events / Logs ─────────────────────────────────────────────────────────────

export function useEvents(limit = 500) {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['unifi', 'events', limit],
    queryFn: () => api.getEvents(limit),
    enabled: ok,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Firewall rules ────────────────────────────────────────────────────────────

export function useFirewallRules() {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['unifi', 'firewall'],
    queryFn: api.getFirewall,
    enabled: ok,
    staleTime: 60_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Networks / VLANs ──────────────────────────────────────────────────────────

export function useNetworks() {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['unifi', 'networks'],
    queryFn: api.getNetworks,
    enabled: ok,
    staleTime: 60_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Site health ───────────────────────────────────────────────────────────────

export function useHealth() {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['unifi', 'health'],
    queryFn: api.getHealth,
    enabled: ok,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Derived: threat events from event stream ──────────────────────────────────

export function useThreats() {
  const events = useEvents(2000)
  const THREAT_KEYS = /block|deny|drop|attack|brute|flood|intrusion|malware|exploit|scan|suspicious|threat|cve|rce/i

  const threats = (events.data ?? [])
    .filter(e => THREAT_KEYS.test(e.message) || e.level === 'critical' || e.level === 'warning')
    .map((e, i) => ({
      id: e.id ?? `t${i}`,
      title: e.message.slice(0, 80),
      description: e.message,
      severity: e.level === 'critical' ? 'critical' : e.level === 'error' ? 'high' : 'medium',
      status: 'open' as const,
      device: e.device || e.ip || 'unknown',
      zone: 'Unbekannt',
      timestamp: new Date(e.timestamp),
      category: e.source,
      cve: e.message.match(/CVE-\d{4}-\d+/)?.[0] ?? null,
    }))

  return { ...events, threats }
}

// ── History events (SQLite-backed) ────────────────────────────────────────────

export function useHistoryEvents(params?: {
  limit?: number; offset?: number; level?: string; search?: string; from?: number; to?: number
}) {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['history', 'events', params],
    queryFn:  () => api.getHistoryEvents(params),
    enabled:  ok,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── History metrics (SQLite-backed) ──────────────────────────────────────────

export function useHistoryMetrics(params?: {
  from?: number; to?: number; resolution?: 'minute' | 'hour' | 'day'
}) {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['history', 'metrics', params],
    queryFn:  () => api.getHistoryMetrics(params),
    enabled:  ok,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Notifications (SQLite-backed) ─────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
  const ok = useConfigured()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey:        ['history', 'notifications', unreadOnly],
    queryFn:         () => api.getNotifications(unreadOnly),
    enabled:         ok,
    staleTime:       30_000,
    refetchInterval: 30_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
  const markAllRead = useCallback(
    () => api.markNotificationsRead().then(() => {
      qc.invalidateQueries({ queryKey: ['history', 'notifications'] })
    }),
    [qc],
  )
  return { ...query, markAllRead }
}

// ── DB stats ──────────────────────────────────────────────────────────────────

export function useDbStats() {
  return useQuery({
    queryKey: ['history', 'stats'],
    queryFn:  api.getDbStats,
    staleTime: 60_000,
  })
}

// ── Known devices (persistent registry) ──────────────────────────────────────

export function useKnownDevices(params?: {
  search?: string; limit?: number; offset?: number; trusted?: boolean; category?: string
}) {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['history', 'known-devices', params],
    queryFn:  () => api.getKnownDevices(params),
    enabled:  ok,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export function useAuditLog(params?: {
  limit?: number; offset?: number; from?: number; to?: number; action?: string
}) {
  const ok = useConfigured()
  return useQuery({
    queryKey: ['history', 'audit', params],
    queryFn:  () => api.getAuditLog(params),
    enabled:  ok,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (n, err) => n < 2 && !(err instanceof ApiError && err.status === 503),
  })
}

// ── App settings ──────────────────────────────────────────────────────────────

export function useAppSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn:  api.getAppSettings,
    staleTime: 60_000,
  })
}

// ── Derived: dashboard metrics ────────────────────────────────────────────────

export function useMetrics() {
  const devices  = useDevices()
  const clients  = useClients()
  const health   = useHealth()
  const firewall = useFirewallRules()
  const networks = useNetworks()
  const threats  = useThreats()

  const wanHealth = (health.data ?? []).find(h => h.subsystem === 'wan')
  const rxRate    = (health.data ?? []).reduce((s, h) => s + (h.rx_bytes_r ?? 0), 0)
  const txRate    = (health.data ?? []).reduce((s, h) => s + (h.tx_bytes_r ?? 0), 0)

  return {
    isLoading: devices.isLoading || clients.isLoading,
    isError:   devices.isError   || clients.isError,
    metrics: {
      totalDevices:      (devices.data?.length ?? 0) + (clients.data?.length ?? 0),
      infraDevices:       devices.data?.length ?? 0,
      activeClients:     clients.data?.filter(c => c.status === 'online').length ?? 0,
      activeThreats:     threats.threats.length,
      networkZones:      networks.data?.length ?? 0,
      firewallRules:     firewall.data?.length ?? 0,
      wanStatus:         wanHealth?.status ?? 'unknown',
      rxBytesPerSec:     rxRate,
      txBytesPerSec:     txRate,
    },
  }
}
