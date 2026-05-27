/**
 * SQLite singleton — opens once, runs pending migrations, exports getDb().
 * WAL mode for concurrent reads while writes are in progress.
 */
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_PATH = process.env.DB_PATH
  ?? path.join(__dirname, '..', 'data', 'unirule.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  runMigrations(_db)
  console.log(`[db] Opened: ${DB_PATH}`)
  return _db
}

// ── Migrations ────────────────────────────────────────────────────────────────

function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    applied_at INTEGER NOT NULL
  )`)

  const migrationsDir = path.join(__dirname, '..', 'migrations')
  if (!fs.existsSync(migrationsDir)) return

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const row = db.prepare('SELECT id FROM _migrations WHERE name = ?').get(file)
    if (row) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)')
      .run(file, Date.now())
    console.log(`[db] Applied migration: ${file}`)
  }
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export function getSetting(key: string, defaultVal: string): string {
  try {
    const row = getDb()
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined
    return row?.value ?? defaultVal
  } catch {
    return defaultVal
  }
}

export function getSettingInt(key: string, defaultVal: number): number {
  return parseInt(getSetting(key, String(defaultVal)), 10) || defaultVal
}
