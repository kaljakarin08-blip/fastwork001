import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const RAG_DB_PATH = process.env.RAG_INDEX_PATH
  ? path.resolve(process.env.RAG_INDEX_PATH)
  : path.resolve(process.cwd(), 'rag', 'index.db')

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 5 } = await req.json()
    if (!query) return NextResponse.json([], { status: 200 })

    if (!fs.existsSync(RAG_DB_PATH)) {
      console.warn('[rag/search] index.db not found:', RAG_DB_PATH)
      return NextResponse.json([])
    }

    const db = new Database(RAG_DB_PATH, { readonly: true })
    const rows = db
      .prepare(
        `SELECT path, title, content
         FROM notes_fts
         WHERE notes_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(query, limit) as Array<{ path: string; title: string; content: string }>
    db.close()

    return NextResponse.json(rows.map(r => ({ ...r, score: 1 })))
  } catch (err) {
    console.error('[rag/search] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
