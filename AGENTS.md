# AGENTS.md — Law AI Content OS (law-content-v2)
> อ่านไฟล์นี้ก่อนทุกครั้ง | Executor: Codex | Orchestrator: Claude Code
> **Last Updated:** 2026-06-24

---

## Project Overview

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui  
**Database:** Supabase PostgreSQL (cloud) — API routes ทั้งหมดใช้ Supabase  
**Local DB:** `better-sqlite3` ยังมีอยู่ใน `lib/local-db/client.ts` แต่ **ใช้เฉพาะใน Electron desktop app เท่านั้น** — ห้ามใช้ใน API routes  
**AI:** OpenAI GPT-4o via `lib/agents/`  
**Background worker:** Hermes (`hermes/worker.ts`) — polls `/api/local/hermes/queue`  
**Deployment:** Vercel (web) + Electron desktop app (`.dmg`)

---

## Dev Runtime Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local 2>/dev/null || true
```
Required:
- `OPENAI_API_KEY=sk-...`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### 3. Start dev server
```bash
pnpm dev   # http://localhost:3000
```

### 4. Start Hermes worker (optional — separate terminal)
```bash
pnpm hermes
```

### 5. Verify runtime is ready
```bash
curl http://localhost:3000/api/health   # → {"ok":true}
```

---

## Quality Gate (ต้องผ่านก่อน DONE)

```bash
pnpm typecheck   # tsc --noEmit — 0 errors
pnpm build       # next build — must succeed
```

---

## Architecture

```
law-content-v2/
├── app/
│   ├── api/
│   │   ├── ai/             ← AI pipeline routes (Supabase-backed)
│   │   ├── health/         ← Health check
│   │   └── local/          ← App routes (Supabase-backed)
│   │       ├── requirements/
│   │       ├── hermes/queue
│   │       ├── jobs/
│   │       ├── stats/
│   │       ├── app-settings/
│   │       ├── brand-profile/
│   │       ├── creative-profiles/
│   │       ├── facebook-accounts/
│   │       ├── rag/            ← RAG search + index (Supabase rag_chunks)
│   │       ├── upload-image/   ← ⚠️ ยังใช้ local fs (Electron only)
│   │       └── calendar/
│   └── dashboard/          ← UI pages (App Router)
│
├── lib/
│   ├── supabase/
│   │   └── admin.ts        ← Supabase admin client (getSupabase())
│   ├── local-db/
│   │   ├── client.ts       ← SQLite singleton — Electron only, ห้ามใช้ใน API routes
│   │   ├── get-setting.ts  ← getSetting() อ่านจาก Supabase app_settings
│   │   └── migrations/     ← SQL migrations (สำหรับ Electron local DB)
│   ├── agents/             ← AI pipeline steps
│   └── prompts/            ← AI prompt templates
│
├── hermes/
│   └── worker.ts           ← Background job processor
│
├── supabase/
│   └── migrations/         ← Supabase schema migrations
│       ├── 001_init.sql
│       └── 002_rag_chunks.sql
│
├── components/             ← Shared UI (shadcn/ui base)
├── types/index.ts          ← Shared TypeScript types
│
└── electron/               ← Desktop packaging (DO NOT touch during web tasks)
```

---

## Database

**Primary DB:** Supabase PostgreSQL — ใช้สำหรับ API routes ทั้งหมดบน Vercel  
**Local DB:** SQLite (`better-sqlite3`) — ใช้เฉพาะ Electron desktop app เท่านั้น

**Supabase key tables:**
| Table | Purpose |
|-------|---------|
| `requirements` | Content requests |
| `jobs` | Pipeline job tracking |
| `outputs` | Generated content + images |
| `app_settings` | OpenAI key, model, settings |
| `brand_profile` | Firm identity |
| `creative_profiles` | Tone/style presets |
| `facebook_accounts` | Connected FB pages |
| `knowledge_sources` | RAG source documents |
| `rag_chunks` | RAG text chunks (ilike search) |

**DB access pattern:**
```ts
import { getSupabase } from '@/lib/supabase/admin'
const sb = getSupabase()
const { data, error } = await sb.from('table').select('*')
```

---

## API Conventions

- ทุก API route ใช้ **Supabase** — ห้ามใช้ `lib/local-db/client.ts` ใน `app/api/`
- Return `NextResponse.json({ error })` on failure
- No auth (single-user app)
- TypeScript types ใน `types/index.ts`

---

## Hermes Worker

Hermes (`hermes/worker.ts`) เป็น AI pipeline runner:
1. Polls `GET /api/local/hermes/queue` ทุก 45s
2. รัน pipeline: topic → content gen → image prompt → image gen → QC
3. Posts output to Facebook ถ้า `publish_at` set

**Environment vars:**
- `OPENAI_API_KEY`
- `HERMES_APP_URL=http://localhost:3000`

---

## Scoping Rules for Codex

**แตะได้:**
- `app/` — pages + API routes
- `lib/` — business logic, agents, prompts
- `lib/supabase/` — Supabase client
- `hermes/` — worker logic
- `components/` — UI components
- `types/index.ts` — shared types
- `supabase/migrations/` — Supabase schema migrations

**ห้ามแตะ:**
- `lib/local-db/client.ts` จาก API routes — Electron only
- `electron/` — Electron main process (PM only)
- `electron-builder.yml` — Package config (PM only)
- `.env.local` — Never commit secrets

---

## Common Tasks

### Add a new API route
1. สร้าง `app/api/local/[name]/route.ts`
2. Import `getSupabase` จาก `lib/supabase/admin`
3. Add TypeScript type ใน `types/index.ts`

### Add a Supabase migration
1. สร้าง `supabase/migrations/00N_description.sql`
2. Apply ใน Supabase dashboard SQL Editor

### Add an AI prompt
1. เพิ่มใน `lib/prompts/` — ห้าม hardcode ใน components

### Run full build check
```bash
pnpm typecheck && pnpm build
```

---

## Escalate to PM (Claude Code) if:

- Architecture decision (new table schema, new pipeline step)
- OpenAI model change
- Electron packaging changes
- Task fails 2+ times
- Unclear scope

**Format:**
```
ESCALATE:
Task: T-xxx
Problem: [description]
Tried: [what was attempted]
Blocked by: [specific blocker]
```
