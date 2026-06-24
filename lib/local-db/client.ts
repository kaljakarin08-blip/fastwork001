import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.LOCAL_DB_PATH ?? path.join(process.cwd(), 'data', 'local.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  return db
}

function runMigrations(database: Database.Database) {
  const migrationDir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'lib', 'local-db', 'migrations')
  if (!fs.existsSync(migrationDir)) return

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const applied = new Set(
    (database.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map(r => r.name)
  )

  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8')
    database.exec(sql)
    database.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString())
    console.log(`[db] Migration applied: ${file}`)
  }
}
