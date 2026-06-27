/**
 * index-vault.ts — Index vault/ folder → rag/index.db (FTS5)
 *
 * Sources (priority order):
 *   1. vault/law/        → domain = 'law'
 *   2. vault/accounting/ → domain = 'accounting'
 *   3. vault/general/    → domain = 'general'
 *   4. OBSIDIAN_VAULT_PATH (legacy) → domain = 'law' (backward compat)
 *
 * Usage:
 *   pnpm rag:index
 *
 * Env (optional):
 *   OBSIDIAN_VAULT_PATH  — legacy Obsidian vault path
 *   RAG_INDEX_PATH       — output DB path (default: rag/index.db)
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

// ── Paths ─────────────────────────────────────────────────────────
const CWD = process.cwd()
const LOCAL_VAULT = path.join(CWD, 'vault')
const LEGACY_VAULT = process.env.OBSIDIAN_VAULT_PATH ?? ''
const DB_PATH = process.env.RAG_INDEX_PATH
  ? path.resolve(process.env.RAG_INDEX_PATH)
  : path.resolve(CWD, 'rag', 'index.db')

// ── Config ────────────────────────────────────────────────────────
const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

// Legacy Obsidian: folders to skip
const SKIP_DIRS = new Set([
  '00_Inbox', '01_Templates', '08_Daily_Notes',
  'hermes_agents', 'scripts', '.obsidian', '.trash',
])

type Domain = 'law' | 'accounting' | 'general'

// ── Helpers ───────────────────────────────────────────────────────
function parseFrontmatter(raw: string): { title: string; tags: string[]; body: string } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
  if (!fmMatch) return { title: '', tags: [], body: raw }
  const fm = fmMatch[1]
  const body = fmMatch[2].trim()
  const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m)
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')) : [],
    body,
  }
}

function chunkText(body: string): string[] {
  const sections = body.split(/(?=^#{1,4} )/m).filter(s => s.trim().length > 50)
  const chunks: string[] = []
  for (const section of sections) {
    if (section.length <= CHUNK_SIZE) {
      chunks.push(section.trim())
    } else {
      let start = 0
      while (start < section.length) {
        chunks.push(section.slice(start, Math.min(start + CHUNK_SIZE, section.length)).trim())
        start += CHUNK_SIZE - CHUNK_OVERLAP
      }
    }
  }
  return chunks.filter(c => c.length > 30)
}

function walkDir(dir: string, skipDirs?: Set<string>): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (skipDirs?.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full, skipDirs))
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) files.push(full)
  }
  return files
}

// ── Collect sources ───────────────────────────────────────────────
interface Source { filePath: string; domain: Domain; basePath: string }

function collectSources(): Source[] {
  const sources: Source[] = []

  // 1. Local vault/ (primary)
  if (fs.existsSync(LOCAL_VAULT)) {
    const domainMap: Record<string, Domain> = {
      law: 'law',
      accounting: 'accounting',
      general: 'general',
    }
    for (const [folder, domain] of Object.entries(domainMap)) {
      const dir = path.join(LOCAL_VAULT, folder)
      if (!fs.existsSync(dir)) continue
      for (const filePath of walkDir(dir)) {
        sources.push({ filePath, domain, basePath: LOCAL_VAULT })
      }
    }
    console.log(`vault/: ${sources.length} files`)
  }

  // 2. Legacy Obsidian vault (backward compat → domain = 'law')
  if (LEGACY_VAULT && fs.existsSync(LEGACY_VAULT)) {
    const legacyFiles = walkDir(LEGACY_VAULT, SKIP_DIRS)
    for (const filePath of legacyFiles) {
      sources.push({ filePath, domain: 'law', basePath: LEGACY_VAULT })
    }
    console.log(`Obsidian legacy: ${legacyFiles.length} files`)
  }

  return sources
}

// ── Main ──────────────────────────────────────────────────────────
function main() {
  const sources = collectSources()
  if (sources.length === 0) {
    console.error('No source files found.')
    console.error(`  Put .md files in vault/law/, vault/accounting/, or vault/general/`)
    process.exit(1)
  }

  console.log(`Index DB: ${DB_PATH}`)

  // Rebuild DB
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH)
  const db = new Database(DB_PATH)

  db.exec(`
    CREATE VIRTUAL TABLE notes_fts USING fts5(
      path,
      title,
      domain,
      content,
      tokenize='trigram'
    );
  `)

  const insert = db.prepare(
    'INSERT INTO notes_fts (path, title, domain, content) VALUES (?, ?, ?, ?)'
  )
  const insertMany = db.transaction((rows: Array<[string, string, string, string]>) => {
    for (const row of rows) insert.run(...row)
  })

  let totalChunks = 0
  const batch: Array<[string, string, string, string]> = []

  for (const { filePath, domain, basePath } of sources) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { title, body } = parseFrontmatter(raw)
    const displayTitle = title || path.basename(filePath, path.extname(filePath))
    const relPath = path.relative(basePath, filePath)
    const chunks = chunkText(body)
    if (chunks.length === 0) continue
    for (const chunk of chunks) {
      batch.push([relPath, displayTitle, domain, chunk])
      totalChunks++
    }
  }

  insertMany(batch)
  db.close()

  // Summary
  const byDomain = batch.reduce<Record<string, number>>((acc, [, , domain]) => {
    acc[domain] = (acc[domain] ?? 0) + 1
    return acc
  }, {})

  console.log(`\n✅ Indexed ${sources.length} files → ${totalChunks} chunks`)
  for (const [domain, count] of Object.entries(byDomain)) {
    console.log(`   ${domain.padEnd(12)} ${count} chunks`)
  }
  console.log('Done.')
}

main()
