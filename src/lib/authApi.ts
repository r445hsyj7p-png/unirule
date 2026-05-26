/** Auth-specific API calls — separate from main api.ts to avoid circular deps */

export interface AuthStatus {
  configured: boolean
  authenticated: boolean
  username: string | null
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw Object.assign(new Error(data.message ?? data.error ?? res.statusText), { status: res.status, code: data.error })
  return data as T
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' })
  const data = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw Object.assign(new Error(data.message ?? data.error ?? res.statusText), { status: res.status })
  return data as T
}

export const authApi = {
  status:  () => get<AuthStatus>('/api/auth/status'),
  setup:   (username: string, password: string) =>
    post<{ ok: boolean; username: string }>('/api/auth/setup', { username, password }),
  login:   (username: string, password: string) =>
    post<{ ok: boolean; username: string }>('/api/auth/login', { username, password }),
  logout:  () => post<{ ok: boolean }>('/api/auth/logout'),
  blockedIps: () => get<Array<{ ip: string; lockedAt: number; lockedUntil: number }>>('/api/auth/blocked-ips'),
}
