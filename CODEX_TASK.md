# CODEX TASK — Fix RAG routes: replace SQLite with Supabase

## Problem
Vercel error: `ENOENT: no such file or directory, mkdir '/var/task/data'`

`app/api/local/rag/search/route.ts` และ `app/api/local/rag/index-url/route.ts`
ยังใช้ `better-sqlite3` เขียน/อ่าน local file ซึ่งทำไม่ได้บน Vercel serverless

## Context Files
- `app/api/local/rag/search/route.ts` — อ่าน SQLite FTS5 index
- `app/api/local/rag/index-url/route.ts` — fetch URL แล้ว write ลง SQLite + Supabase
- `lib/supabase/admin.ts` — Supabase admin client (`getSupabase()`)
- `supabase/migrations/001_init.sql` — ดู table: `knowledge_sources`

## Plan

### Step 1: Add migration — `rag_chunks` table
สร้างไฟล์ `supabase/migrations/002_rag_chunks.sql`:
```sql
CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON rag_chunks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);
```
แล้ว apply ใน Supabase SQL Editor: https://supabase.com/dashboard/project/dkseijfwqfaajprbsjwt/sql

### Step 2: แก้ `app/api/local/rag/index-url/route.ts`
- ลบ `better-sqlite3`, `fs`, `path`, `getRagDb()` ออกทั้งหมด
- แทน `insertMany(chunks)` ด้วย Supabase insert ลง `rag_chunks`
- ก่อน insert ให้ delete chunks เก่าของ source นี้ก่อน:
  `sb.from('rag_chunks').delete().eq('source_id', id)`
- insert rows: `{ id: crypto.randomUUID(), source_id: id, path, title, content, created_at: now }`

### Step 3: แก้ `app/api/local/rag/search/route.ts`
- ลบ `better-sqlite3`, `fs`, `path` ออกทั้งหมด
- แทน SQLite FTS5 query ด้วย Supabase `ilike` search บน `rag_chunks.content`:
  ```ts
  sb.from('rag_chunks')
    .select('path, title, content')
    .ilike('content', `%${query}%`)
    .limit(limit)
  ```
- return `rows` ในรูปเดิม `[{ path, title, content, score: 1 }]`

## Scope
- `supabase/migrations/002_rag_chunks.sql` (สร้างใหม่)
- `app/api/local/rag/search/route.ts`
- `app/api/local/rag/index-url/route.ts`

## DO NOT TOUCH
- `lib/local-db/client.ts`
- `rag/scripts/`
- `hermes/`
- Schema อื่น

## Quality Gate
```bash
npm run build  # ต้องผ่าน 0 errors
```

## Stop When
implement ครบ → build ผ่าน → แจ้งผล
