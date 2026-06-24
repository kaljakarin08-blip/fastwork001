/**
 * Index Obsidian vault → rag/index.db (FTS5)
 * Usage: pnpm rag:index
 * Env:   OBSIDIAN_VAULT_PATH (default: /Users/jakarinosk/documents/rag_law)
 *        RAG_INDEX_PATH      (default: rag/index.db)
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH ?? '/Users/jakarinosk/documents/rag_law'
const DB_PATH = process.env.RAG_INDEX_PATH
  ? path.resolve(process.env.RAG_INDEX_PATH)
  : path.resolve(process.cwd(), 'rag', 'index.db')

// Folders to skip
const SKIP_DIRS = new Set([
  '00_Inbox', '01_Templates', '08_Daily_Notes',
  'hermes_agents', 'scripts', '.obsidian', '.trash',
])

// Max chars per chunk (FTS5 works best with focused chunks)
const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

// --- Frontmatter parser ---
function parseFrontmatter(raw: string): { title: string; tags: string[]; body: string } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
  if (!fmMatch) return { title: '', tags: [], body: raw }

  const fm = fmMatch[1]
  const body = fmMatch[2].trim()

  const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m)

  const title = titleMatch ? titleMatch[1].trim() : ''
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
    : []

  return { title, tags, body }
}

// --- Chunk text by headings, then by size ---
function chunkText(body: string): string[] {
  // Split on markdown headings (##, ###, ####)
  const sections = body.split(/(?=^#{1,4} )/m).filter(s => s.trim().length > 50)

  const chunks: string[] = []
  for (const section of sections) {
    if (section.length <= CHUNK_SIZE) {
      chunks.push(section.trim())
    } else {
      // Further split by size with overlap
      let start = 0
      while (start < section.length) {
        const end = Math.min(start + CHUNK_SIZE, section.length)
        chunks.push(section.slice(start, end).trim())
        start += CHUNK_SIZE - CHUNK_OVERLAP
      }
    }
  }

  return chunks.filter(c => c.length > 30)
}

// --- Walk vault ---
function walkVault(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (SKIP_DIRS.has(entry.name)) continue

    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkVault(full))
    } else if (entry.name.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

// --- Main ---
function main() {
  if (!fs.existsSync(VAULT_PATH)) {
    console.error(`Vault not found: ${VAULT_PATH}`)
    process.exit(1)
  }

  console.log(`Vault:    ${VAULT_PATH}`)
  console.log(`Index DB: ${DB_PATH}`)

  // Rebuild DB from scratch
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH)
  const db = new Database(DB_PATH)

  db.exec(`
    CREATE VIRTUAL TABLE notes_fts USING fts5(
      path,
      title,
      content,
      tokenize='trigram'
    );
  `)

  const insert = db.prepare('INSERT INTO notes_fts (path, title, content) VALUES (?, ?, ?)')
  const insertMany = db.transaction((rows: Array<[string, string, string]>) => {
    for (const row of rows) insert.run(...row)
  })

  const files = walkVault(VAULT_PATH)
  console.log(`Found ${files.length} markdown files`)

  let totalChunks = 0
  const batch: Array<[string, string, string]> = []

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { title, body } = parseFrontmatter(raw)

    // Use filename as fallback title
    const displayTitle = title || path.basename(filePath, '.md')
    const relPath = path.relative(VAULT_PATH, filePath)

    const chunks = chunkText(body)
    if (chunks.length === 0) continue

    for (const chunk of chunks) {
      batch.push([relPath, displayTitle, chunk])
      totalChunks++
    }
  }

  insertMany(batch)
  db.close()

  console.log(`Indexed ${files.length} files → ${totalChunks} chunks`)
  console.log('Done.')
}

main()
