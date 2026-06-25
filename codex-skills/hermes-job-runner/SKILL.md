---
name: hermes-job-runner
description: Run one Hermes content job end to end in law-content-v2 when the task involves pending jobs, topic guard, URL-backed context, layout suggestion, RAG merge, output persistence, or cron-triggered job processing.
---

# Hermes Job Runner

Use this skill when working on the Hermes pipeline in `law-content-v2`, especially:
- claim or inspect one pending job
- debug topic guard or off-topic rejection
- trace URL fetch into content generation
- trace layout suggestion and image prompt shaping
- verify how outputs are persisted

## Before coding
1. Read `AGENTS.md`.
2. Read the current task file if one is named.
3. Verify live schema and table names before trusting task wording.
4. Prefer the existing save flow over inventing a new one.

## Repo truth
Read `references/repo-truth.md` before changing persistence or route wiring.

## Workflow
1. Identify the active entrypoint:
   - local worker: `hermes/worker.ts`
   - cron route: `app/api/hermes/run/route.ts`
2. Trace one job only:
   - claim job
   - load requirement
   - fetch URL content if `source_url` exists
   - run topic guard
   - determine layout
   - run RAG search
   - merge URL and RAG context
   - generate content
   - generate image prompt
   - persist outputs and statuses
3. Fix the shared flow, not one branch.
4. Keep diffs narrow and inside allowed files.

## Validation
Run:
- `rtk pnpm typecheck`
- `rtk pnpm build`

If build fails on Google Fonts in sandbox, rerun outside sandbox to separate environment failure from code failure.

## Output contract
Report:
- what changed
- whether the one-job flow is intact
- exact blockers if env, schema, or deploy truth differs from task wording
