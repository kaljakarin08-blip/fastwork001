# Repo Truth

- API and runtime persistence is Supabase-backed.
- Existing Hermes save route is `app/api/local/hermes/requirements/[id]/output/route.ts`.
- Live tables in this flow include:
  - `requirements`
  - `jobs`
  - `content_outputs`
  - `image_prompts`
  - `video_prompts`
  - `rag_sources`
- Re-check table names before following task files literally. Some task text may say `outputs` while the repo uses `content_outputs`.
- Do not add new save paths unless explicitly required.
