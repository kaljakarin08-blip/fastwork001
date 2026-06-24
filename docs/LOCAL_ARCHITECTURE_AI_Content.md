# Local Architecture: Law AI Content OS

## 1. Architecture Goal

Build a local-first AI content production system that runs on the client's machine before moving to cloud.

No Supabase in MVP.
No cloud database in MVP.
Only optional external dependency is Video API.

---

## 2. High-Level Architecture

```text
Existing Web Dashboard
        ↓
Local Backend/API
        ↓
SQLite Local DB
        ↓
Hermes Worker
        ↓
Local RAG Search
        ↓
Obsidian Vault
        ↓
Codex Runtime for research/data prep
        ↓
Output saved back to SQLite
        ↓
Dashboard review/calendar
```

---

## 3. Component Responsibilities

## 3.1 Existing Web Dashboard

Responsible for:

```text
- Requirement form
- Facebook account selector
- Queue view
- Output review
- Calendar preparation
- Manual schedule selection
- Settings
```

Not responsible for:

```text
- AI orchestration logic
- Codex control
- RAG indexing logic
- Video rendering logic
```

---

## 3.2 Local Backend

Can be implemented using:

```text
- Next.js API routes if dashboard is Next.js
- Express/Fastify if separate backend is easier
```

Responsible for:

```text
- CRUD requirements
- CRUD facebook accounts
- CRUD outputs
- Queue API for Hermes
- Local SQLite access
- Settings management
```

Suggested local endpoints:

```text
GET    /api/local/requirements
POST   /api/local/requirements
GET    /api/local/requirements/:id
PATCH  /api/local/requirements/:id

GET    /api/local/facebook-accounts
POST   /api/local/facebook-accounts
PATCH  /api/local/facebook-accounts/:id

GET    /api/local/hermes/queue
POST   /api/local/hermes/jobs/:id/status
POST   /api/local/hermes/requirements/:id/output

GET    /api/local/calendar
POST   /api/local/calendar
PATCH  /api/local/calendar/:id

GET    /api/local/rag/sources/:requirement_id
POST   /api/local/rag/reindex
```

---

## 3.3 SQLite Local DB

Use SQLite for MVP.

Recommended location:

```text
./data/law-content-local.db
```

Why SQLite:

```text
- easy local setup
- easy backup
- no server required
- works for MVP workflow validation
```

Migration path later:

```text
SQLite → Supabase/Postgres after workflow stabilizes
```

---

## 3.4 Hermes Worker

Hermes runs as local process.

Responsibilities:

```text
- Poll requirement queue
- Validate requirement
- Search RAG
- Request Codex research if needed
- Generate content text
- Generate image prompt
- Generate layout spec
- Generate video prompt if required
- Submit video API if configured
- Save output
- Update status/logs
```

Run modes:

```text
Manual mode: user runs command manually
Watch mode: Hermes polls queue every 30-60 seconds
Command mode: Telegram/LINE commands trigger jobs
```

---

## 3.5 Codex Runtime

Codex is used as client's local AI worker.

Responsibilities:

```text
- Research/data preparation
- Summarize files/source notes
- Write Obsidian markdown
- Prepare RAG-ready notes
- Refine prompts/workflows if instructed
```

Rule:

```text
Codex is not the system of record.
Codex does not directly update calendar/status unless Hermes requests it.
```

---

## 3.6 Obsidian Vault

Recommended vault path:

```text
./vault/law-content-vault
```

Folder structure:

```text
/00_Inbox
/01_Sources
/02_Client_Briefs
/03_Knowledge_Base
/04_Content_Angles
/05_RAG_Ready
/06_Content_Outputs
/07_Image_Prompts
/08_Video_Prompts
/09_Calendar
/99_Archive
```

RAG should index mostly:

```text
/03_Knowledge_Base
/04_Content_Angles
/05_RAG_Ready
```

---

## 3.7 Local RAG

Suggested options:

```text
Option A: Chroma
Option B: LanceDB
Option C: SQLite + vector extension
Option D: Local Postgres + pgvector
```

Recommended MVP:

```text
Chroma or LanceDB + SQLite metadata
```

RAG process:

```text
1. Read markdown from Obsidian
2. Chunk notes
3. Embed chunks
4. Store vector index locally
5. Search by requirement topic/brief
6. Return source notes to Hermes
```

---

## 3.8 Video API

Only external API in MVP.

Rules:

```text
- Optional only
- Use only when video_create=true
- Must run async
- Must store status
- Must not block dashboard
```

Video statuses:

```text
not_requested
prompt_ready
submitted_to_video_api
rendering
completed
failed
```

---

## 3.9 Telegram / LINE Commands

### Telegram

Recommended first because it works well with local polling.

Command examples:

```text
/newreq <topic>
/status <id>
/schedule <id> <YYYY-MM-DD> <HH:mm> <account_alias>
/approve <id>
/reject <id> <reason>
```

### LINE

Do later because LINE needs public webhook.

Options:

```text
- ngrok
- cloudflared
- cloud deployment later
```

---

## 4. Local Folder Structure

```text
law-content-local/
├── app/                         # existing dashboard app
├── hermes/                      # Hermes worker files
│   ├── HERMES_SYSTEM.md
│   ├── HERMES_WORKFLOW.md
│   ├── HERMES_TASK_TEMPLATE.md
│   ├── HERMES_INSTALL.md
│   └── prompts/
├── data/
│   └── law-content-local.db
├── vault/
│   └── law-content-vault/
├── rag/
│   ├── index/
│   ├── scripts/
│   └── config.json
├── logs/
│   ├── hermes.log
│   ├── codex.log
│   └── video.log
├── exports/
└── .env.local
```

---

## 5. Environment Variables

```env
LOCAL_DB_PATH=./data/law-content-local.db
OBSIDIAN_VAULT_PATH=./vault/law-content-vault
RAG_INDEX_PATH=./rag/index
HERMES_POLL_INTERVAL_SECONDS=45
CODEX_RUNTIME=local
TELEGRAM_BOT_TOKEN=
VIDEO_API_PROVIDER=
VIDEO_API_KEY=
ENABLE_LINE=false
ENABLE_AUTO_PUBLISH=false
```

---

## 6. Processing Sequence

```text
1. User creates requirement from dashboard
2. Requirement saved to SQLite
3. Job created with status requested
4. Hermes picks up job
5. Hermes validates requirement
6. Hermes searches local RAG
7. If weak RAG result, Hermes creates Codex research task
8. Codex writes RAG-ready note into Obsidian
9. Hermes triggers RAG re-index
10. Hermes generates content text
11. Hermes generates image prompt + layout spec
12. If video_create=true, Hermes generates video brief
13. If Video API configured, Hermes submits video job
14. Hermes saves output
15. Dashboard shows output_ready/review_pending
16. User chooses date/account/page on calendar
17. User approves/export/prepares publish
```

---

## 7. Migration to Cloud Later

When stable:

```text
SQLite → Supabase/Postgres
Local worker → VPS worker or client machine worker
Local RAG → managed vector DB or Supabase pgvector
Telegram polling → webhook
LINE local tunnel → production webhook
Manual schedule → Buffer/Meta integration
```

Do not migrate until:

```text
- status flow stable
- requirement fields stable
- output structure stable
- customer approval flow stable
- account/page selector stable
```
