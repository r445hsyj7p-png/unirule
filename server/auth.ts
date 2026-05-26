/**
 * Unirule Authentication Module
 *
 * - Credentials stored (hashed) in data/auth.json
 * - JWT signed with an auto-generated secret (also in data/auth.json)
 * - Tokens delivered as HttpOnly, SameSite=Strict cookies
 * - Rate-limiter: 5 failures per IP → 15 min lockout
 * - Blocked IPs logged in-memory (survives until server restart)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { Request, Response, NextFunction } from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_PATH  = process.env.AUTH_PATH ?? path.join(__dirname, '..', 'data', 'auth.json')
const COOKIE_NAME = 'unirule_session'
const SESSION_DURATION = 8 * 60 * 60 // 8 h in seconds

// ── Persisted auth store ──────────────────────────────────────────────────────

interface AuthStore {
  username: string
  passwordHash: string
  jwtSecret: string
}

let _store: AuthStore | null = null

function loadStore(): AuthStore | null {
  try {
    if (fs.existsSync(AUTH_PATH)) {
      const raw = fs.readFileSync(AUTH_PATH, 'utf8')
      _store = JSON.parse(raw) as AuthStore
      return _store
    }
  } catch { /* ignore */ }
  return null
}

function saveStore(store: AuthStore) {
  try {
    const dir = path.dirname(AUTH_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(AUTH_PATH, JSON.stringify(store, null, 2), { mode: 0o600 })
    try { fs.chmodSync(AUTH_PATH, 0o600) } catch { /* non-fatal */ }
    _store = store
  } catch (e) {
    console.warn('[auth] Could not persist auth store:', e)
  }
}

export function getAuthStore(): AuthStore | null {
  if (_store) return _store
  return loadStore()
}

export function isConfigured(): boolean {
  return getAuthStore() !== null
}

export async function setupCredentials(username: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12)
  const jwtSecret    = crypto.randomBytes(64).toString('hex')
  saveStore({ username, passwordHash, jwtSecret })
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

interface RateLimitEntry {
  failures: number
  lockedUntil: number | null
  lastFailure: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
export const blockedIpLog: Array<{ ip: string; lockedAt: number; lockedUntil: number }> = []

const MAX_FAILURES  = 5
const LOCKOUT_MS    = 15 * 60 * 1000 // 15 min

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const entry = rateLimitMap.get(ip)
  if (!entry) return { allowed: true }

  const now = Date.now()
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remainingMs: entry.lockedUntil - now }
  }
  // Lock expired — reset
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    rateLimitMap.delete(ip)
  }
  return { allowed: true }
}

function recordFailure(ip: string) {
  const now  = Date.now()
  const entry = rateLimitMap.get(ip) ?? { failures: 0, lockedUntil: null, lastFailure: now }
  entry.failures++
  entry.lastFailure = now
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS
    blockedIpLog.push({ ip, lockedAt: now, lockedUntil: entry.lockedUntil })
    console.warn(`[auth] IP ${ip} locked out after ${entry.failures} failures`)
  }
  rateLimitMap.set(ip, entry)
}

function recordSuccess(ip: string) {
  rateLimitMap.delete(ip)
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

function signToken(username: string, secret: string): string {
  return jwt.sign({ sub: username }, secret, { expiresIn: SESSION_DURATION })
}

function verifyToken(token: string, secret: string): { sub: string } | null {
  try {
    return jwt.verify(token, secret) as { sub: string }
  } catch {
    return null
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    // secure only if served over HTTPS (detected via X-Forwarded-Proto or TLS)
    // In local/Docker setups this is typically false — override via env if needed
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: SESSION_DURATION * 1000,
    path: '/',
  })
}

function clearCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

// ── Auth middleware ───────────────────────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const store = getAuthStore()
  if (!store) {
    // Not set up yet — only /api/auth/setup should be reachable
    return res.status(503).json({ error: 'NOT_SETUP', message: 'Unirule nicht eingerichtet.' })
  }

  const token = req.cookies?.[COOKIE_NAME] as string | undefined
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHENTICATED' })
  }

  const payload = verifyToken(token, store.jwtSecret)
  if (!payload) {
    clearCookie(res)
    return res.status(401).json({ error: 'INVALID_TOKEN' })
  }

  next()
}

// ── Auth route handlers ───────────────────────────────────────────────────────

/** GET /api/auth/status — is the app set up? is the user logged in? */
export function handleAuthStatus(req: Request, res: Response) {
  const store = getAuthStore()
  if (!store) return res.json({ configured: false, authenticated: false })

  const token   = req.cookies?.[COOKIE_NAME] as string | undefined
  const payload = token ? verifyToken(token, store.jwtSecret) : null
  return res.json({
    configured:    true,
    authenticated: !!payload,
    username:      payload?.sub ?? null,
  })
}

/** POST /api/auth/setup — first-run credential creation */
export async function handleSetup(req: Request, res: Response) {
  if (isConfigured()) {
    return res.status(409).json({ error: 'ALREADY_CONFIGURED', message: 'Bereits eingerichtet.' })
  }
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Username und Passwort erforderlich.' })
  }
  if (username.trim().length < 2) {
    return res.status(400).json({ error: 'INVALID_USERNAME', message: 'Username mindestens 2 Zeichen.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Passwort mindestens 8 Zeichen.' })
  }
  await setupCredentials(username.trim(), password)
  const store = getAuthStore()!
  const token = signToken(store.username, store.jwtSecret)
  setCookie(res, token)
  return res.json({ ok: true, username: store.username })
}

/** POST /api/auth/login */
export async function handleLogin(req: Request, res: Response) {
  const store = getAuthStore()
  if (!store) {
    return res.status(503).json({ error: 'NOT_SETUP' })
  }

  const ip = getClientIp(req)
  const { allowed, remainingMs } = checkRateLimit(ip)
  if (!allowed) {
    const mins = Math.ceil((remainingMs ?? 0) / 60_000)
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: `Zu viele Fehlversuche. Bitte ${mins} Minute(n) warten.`,
    })
  }

  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS' })
  }

  const usernameMatch = username.trim().toLowerCase() === store.username.toLowerCase()
  const passwordMatch = await bcrypt.compare(password, store.passwordHash)

  if (!usernameMatch || !passwordMatch) {
    recordFailure(ip)
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Ungültige Zugangsdaten.' })
  }

  recordSuccess(ip)
  const token = signToken(store.username, store.jwtSecret)
  setCookie(res, token)
  return res.json({ ok: true, username: store.username })
}

/** POST /api/auth/logout */
export function handleLogout(_req: Request, res: Response) {
  clearCookie(res)
  return res.json({ ok: true })
}

/** GET /api/auth/me — returns current user info */
export function handleMe(req: Request, res: Response) {
  const store = getAuthStore()!
  const token   = req.cookies?.[COOKIE_NAME] as string | undefined
  const payload = token ? verifyToken(token, store.jwtSecret) : null
  if (!payload) return res.status(401).json({ error: 'UNAUTHENTICATED' })
  return res.json({ username: payload.sub })
}

/** GET /api/auth/blocked-ips — for Settings display */
export function handleBlockedIps(_req: Request, res: Response) {
  return res.json(blockedIpLog.slice(-50)) // last 50 entries
}

// Initialise on module load
loadStore()
