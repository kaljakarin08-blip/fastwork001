# Law AI Content OS — law-content-v2

AI-powered content generation platform สำหรับสำนักงานกฎหมาย  
สร้าง infographic, Facebook post, และ legal content อัตโนมัติด้วย AI

**Stack:** Next.js · Supabase · OpenAI · Electron · Telegram Bot  
**Owner:** Jakarin | **Orchestrator:** Claude Code

---

## Architecture

```
Electron Desktop App
  ├── Next.js (standalone build, port 3000)   ← UI + API routes
  ├── Hermes Worker (tsx/compiled bundle)      ← AI pipeline, Telegram bot
  └── SQLite (better-sqlite3) / Supabase      ← local DB + cloud sync

AI Pipeline:
  content brief → image brief → SVG infographic → DALL-E composite → Facebook post
```

---

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm
- OpenAI API key (เก็บใน DB ไม่ใช่ .env)

### Install & Run

```bash
pnpm install
pnpm dev          # Next.js dev server → http://localhost:3000
```

### Other Scripts

```bash
pnpm build        # Production build (Next.js standalone)
pnpm typecheck    # tsc --noEmit
pnpm hermes       # รัน Hermes AI worker
pnpm telegram     # รัน Telegram bot
pnpm rag:index    # Index Obsidian vault สำหรับ RAG
```

---

## Electron Desktop App

```bash
pnpm electron:rebuild   # rebuild better-sqlite3 สำหรับ Electron ABI
pnpm electron:compile   # compile electron/main.ts
```

**สถานะปัจจุบัน:** Sprint — Electron Packaging (`.dmg` สำหรับ Mac)  
ดูรายละเอียด: `TASKMASTER.md`

---

## Project Structure

```
app/              Next.js App Router (UI + API routes)
lib/
  ├── prompts/    AI prompt templates
  ├── supabase/   Supabase client
  ├── local-db/   SQLite helpers
  └── utils.ts
hermes/           Hermes worker + Telegram bot
electron/         Electron main process
rag/              RAG indexer (Obsidian vault)
supabase/         Migrations
```

---

## Quality Gates

```bash
pnpm build        # ต้อง pass
pnpm typecheck    # ต้อง pass (tsc --noEmit)
```

---

## Orchestration

Project นี้ใช้ HEAD-OFFICE Orchestration:  
- **Claude Code** — Orchestrator (plan, review, approve)  
- **Codex** — Backend/API/Logic worker  
- **Antigravity** — UI/Frontend worker  

ดูกฎทั้งหมด: `/HEAD-OFFICE/AGENTS.md` และ `/HEAD-OFFICE/CLAUDE.md`
