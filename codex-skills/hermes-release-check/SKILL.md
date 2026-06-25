---
name: hermes-release-check
description: Run the pre-release verification flow for Hermes-related changes in law-content-v2, especially typecheck, build, and deploy-readiness checks after pipeline or cron edits.
---

# Hermes Release Check

Use after Hermes-related code changes.

## Required checks
- `rtk pnpm typecheck`
- `rtk pnpm build`

## Interpretation
- Treat code errors as blockers.
- Separate sandbox or network build failures from real code failures.
- Call out non-blocking warnings, but do not confuse them with failed gates.

## Report format
- status: pass or fail
- blocking errors
- non-blocking warnings
- whether the cron route is present in final build output
