---
name: hermes-cron-audit
description: Audit Hermes cron execution in law-content-v2 when the task involves Vercel cron schedules, one-job claim behavior, route existence, or cron-driven job processing regressions.
---

# Hermes Cron Audit

Use this skill when the issue is specifically about scheduled execution.

## Audit steps
1. Verify `vercel.json` cron config exists and targets the expected route.
2. Verify the route exists in the Next build output.
3. Confirm the route processes at most one pending job per run unless the task explicitly wants batching.
4. Confirm running and failed status updates happen even when processing throws.
5. Confirm the route reuses shared pipeline logic instead of duplicating drift-prone logic when practical.

## Do not do
- Do not redesign the whole worker if the problem is only cron wiring.
- Do not assume Vercel behavior from local code alone if deployment truth is being asked.
