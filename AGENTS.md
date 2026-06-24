# AGENTS.md — Law AI Content OS (law-content-v2)
> อ่านไฟล์นี้ก่อนทุกครั้ง | Executor: Codex | Orchestrator: Claude Code

---

## Project Overview

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui  
**Database:** SQLite local (`better-sqlite3`) — ไม่มี Supabase, ไม่มี network DB  
**AI:** OpenAI GPT-4o via `lib/agents/`  
**Background worker:** Hermes (`hermes/worker.ts`) — polls `/api/local/hermes/queue`  
**Deployment target:** Electron desktop app (`.dmg`) — packaged via `electron-builder`

---

## Dev Runtime Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Environment variables
Copy `.env.local.example` → `.env.local` (ถ้ายังไม่มี):
```bash
cp .env.local.example .env.local 2>/dev/null || true
```
Required:
- `OPENAI_API_KEY=sk-...` — ใส่ key ที่มี
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### 3. Start dev server
```bash
pnpm dev
```
Next.js runs on **http://localhost:3000**

### 4. Start Hermes worker (optional — separate terminal)
```bash
pnpm hermes
```
Hermes จะ poll `/api/local/hermes/queue` ทุก 45 วินาที

### 5. Verify runtime is ready
```bash
curl http://localhost:3000/api/health   # → {"ok":true}
curl http://localhost:3000/api/local/stats
```

---

## Quality Gate (ต้องผ่านก่อน DONE)

```bash
pnpm typecheck   # tsc --noEmit — 0 errors
pnpm build       # next build — must succeed
```

No lint script — typecheck + build เป็น gate หลัก

---

## Architecture

```
law-content-v2/
├── app/
│   ├── api/local/          ← API routes ทั้งหมด (SQLite-backed)
│   │   ├── requirements/   ← CRUD content requirements
│   │   ├── hermes/queue    ← Hermes job queue
│   │   ├── jobs/           ← Job status tracking
│   │   ├── stats/          ← Dashboard stats
│   │   ├── app-settings/   ← OpenAI key, model, etc.
│   │   ├── brand-profile/  ← Firm name, tone, colors
│   │   ├── creative-profiles/
│   │   ├── facebook-accounts/
│   │   ├── rag/search      ← Full-text search (FTS5)
│   │   └── calendar/       ← Scheduled posts
│   └── dashboard/          ← UI pages (App Router)
│
├── lib/
│   ├── local-db/
│   │   ├── client.ts       ← SQLite singleton (better-sqlite3)
│   │   └── migrations/     ← SQL migration files (001–007)
│   ├── agents/             ← AI pipeline steps
│   │   ├── content-gen.ts
│   │   ├── image-gen.ts
│   │   ├── image-prompt.ts
│   │   ├── qc-agent.ts
│   │   └── source-search.ts
│   └── prompts/            ← All AI prompts (never hardcode in components)
│
├── hermes/
│   └── worker.ts           ← Background job processor
│
├── components/             ← Shared UI (shadcn/ui base)
├── types/index.ts          ← Shared TypeScript types
│
└── electron/               ← Desktop packaging (DO NOT touch during web tasks)
    ├── main.ts
    └── splash.html
```

---

## Database

**SQLite path (dev):** `./local.db` (project root, gitignored)  
**SQLite path (production/Electron):** `~/Library/Application Support/Law AI Content OS/data/local.db`

Migrations run automatically on first request via `lib/local-db/client.ts`.

**Key tables:**
| Table | Purpose |
|-------|---------|
| `requirements` | Content requests from user |
| `jobs` | Pipeline job tracking (queued/running/done/failed) |
| `outputs` | Generated content + images |
| `app_settings` | OpenAI key, model, poll interval |
| `brand_profile` | Firm identity |
| `creative_profiles` | Tone/style presets |
| `facebook_accounts` | Connected FB pages |

**Never use Supabase or any external DB** — everything is local SQLite.

---

## API Conventions

All API routes under `app/api/local/`:
- Use `lib/local-db/client.ts` for DB access
- Return `NextResponse.json({ error })` on failure
- No auth (local app, single user)
- TypeScript types in `types/index.ts`

---

## Hermes Worker

Hermes (`hermes/worker.ts`) is the AI pipeline runner:
1. Polls `GET /api/local/hermes/queue` every 45s
2. Picks up `queued` requirements
3. Runs pipeline: topic → content gen → image prompt → image gen → QC
4. Updates requirement status via `PATCH /api/local/requirements/[id]`
5. Posts output to Facebook if `publish_at` is set

**Environment vars Hermes needs:**
- `OPENAI_API_KEY`
- `HERMES_APP_URL=http://localhost:3000` (defaults to this)

---

## Scoping Rules for Codex

**แตะได้:**
- `app/` — pages + API routes
- `lib/` — business logic, agents, prompts, DB client
- `hermes/` — worker logic
- `components/` — UI components
- `types/index.ts` — shared types
- `supabase/` — จริงๆ ไม่มี Supabase แต่ถ้ามี migration ให้เป็น SQLite migration ใน `lib/local-db/migrations/`

**ห้ามแตะ:**
- `electron/` — Electron main process (PM only)
- `scripts/` — Build scripts (PM only)
- `electron-builder.yml` — Package config (PM only)
- `.env.local` — Never commit secrets

---

## Common Tasks

### Add a new API route
1. สร้าง `app/api/local/[name]/route.ts`
2. Import `getDb` จาก `lib/local-db/client.ts`
3. Add TypeScript type ใน `types/index.ts`

### Add a migration
1. สร้าง `lib/local-db/migrations/008_description.sql`
2. Migrations รันอัตโนมัติ — ไม่ต้อง run script เอง

### Add an AI prompt
1. เพิ่มใน `lib/prompts/` — ห้าม hardcode ใน components
2. Export เป็น function หรือ string constant

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
