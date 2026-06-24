# TASK_RESULT — HERMES-V2

## Status
- Done

## Implemented
- Added `supabase/migrations/003_add_source_url.sql`
- Added `source_url` to `Requirement` and layout metadata types to `types/index.ts`
- Upgraded `hermes/worker.ts` to:
  - fetch URL content before topic guard
  - auto-suggest Facebook layout via LLM guard
  - merge URL content into RAG context for content generation
  - inject layout spec into image prompt system instructions
  - persist `suggested_layout` and `layout_spec` after output save
  - export `processJob()` for reuse by Vercel cron route
  - keep local worker polling only when run as the main script
- Added `app/api/hermes/run/route.ts` for 1-job-per-run Vercel Cron execution
- Added `vercel.json` cron schedule for `/api/hermes/run`

## Runtime Note
- `CODEX_TASK.md` said to alter table `outputs`, but this repo uses `content_outputs` in the live Supabase/API flow. Migration was implemented against `content_outputs` so it applies cleanly to the actual schema.

## Verification
- `pnpm typecheck` ✅
- `pnpm build` ✅

## Non-blocking Warning
- `pnpm build` still shows the existing NFT trace warning from `next.config.ts` import flow, but build completes successfully.
