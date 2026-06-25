---
name: hermes-runtime-qa
description: Verify Hermes runtime health in law-content-v2 when the user asks to smoke test queue processing, cron readiness, job state transitions, or output persistence.
---

# Hermes Runtime QA

Use this skill for runtime truth checks, not feature design.

## Checks
1. Verify app health endpoint.
2. Verify Hermes entrypoint exists:
   - local queue worker
   - cron route
3. Inspect pending, running, and failed jobs.
4. Confirm requirement status transitions make sense.
5. Confirm output rows exist where the pipeline says they should.

## Rules
- Prefer live truth over docs.
- If credentials, env, or network block verification, stop at the blocker and report it plainly.
- Do not infer success from config alone.

## Validation output
Return:
- verified
- not verified
- blocked by
- exact route, table, or file involved
