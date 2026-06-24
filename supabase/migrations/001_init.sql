-- Law Content v2 — Initial Schema
-- Apply in Supabase SQL Editor: https://supabase.com/dashboard/project/dkseijfwqfaajprbsjwt/sql

-- ─── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS facebook_accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_id TEXT,
  brand_voice TEXT,
  default_timezone TEXT DEFAULT 'Asia/Bangkok',
  default_posting_slots TEXT,
  page_access_token TEXT,
  token_expires_at TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creative_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color_scheme TEXT,
  photography_style TEXT,
  logo_usage TEXT,
  visual_mood TEXT,
  do_not_use TEXT,
  notes TEXT,
  reference_image_urls TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  brief TEXT,
  target_audience TEXT,
  objective TEXT,
  tone TEXT,
  platform TEXT DEFAULT 'facebook',
  facebook_account_id TEXT REFERENCES facebook_accounts(id),
  content_type TEXT DEFAULT 'post',
  image_direction TEXT,
  layout_requirement TEXT,
  video_create INTEGER DEFAULT 0,
  video_style TEXT,
  video_duration INTEGER,
  preferred_post_date TEXT,
  preferred_post_time TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'requested',
  notes TEXT,
  creative_profile_id TEXT REFERENCES creative_profiles(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  job_type TEXT DEFAULT 'content_production',
  status TEXT DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rag_sources (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  note_path TEXT NOT NULL,
  note_title TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  relevance_score FLOAT DEFAULT 0.5,
  used_in_output INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_outputs (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  title TEXT,
  hook TEXT,
  caption TEXT,
  body TEXT,
  cta TEXT,
  hashtags TEXT,
  compliance_note TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS image_prompts (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  main_prompt TEXT,
  text_overlay TEXT,
  negative_prompt TEXT,
  layout_spec TEXT,
  canvas_size TEXT DEFAULT '1:1',
  safe_margin TEXT,
  brand_style TEXT,
  dalle_prompt TEXT,
  generated_image_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_prompts (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  video_title TEXT,
  duration INTEGER,
  hook TEXT,
  scene_breakdown TEXT,
  voiceover_script TEXT,
  visual_prompts TEXT,
  subtitle_text TEXT,
  cta TEXT,
  music_mood TEXT,
  text_animations TEXT,
  tools_suggestion TEXT,
  api_provider TEXT,
  api_status TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_items (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  facebook_account_id TEXT REFERENCES facebook_accounts(id),
  post_date TEXT,
  post_time TEXT,
  status TEXT DEFAULT 'draft',
  image_url TEXT,
  caption_override TEXT,
  scheduled_status TEXT DEFAULT 'pending',
  fb_post_id TEXT,
  fb_permalink TEXT,
  published_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS command_logs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  command_text TEXT NOT NULL,
  parsed_action TEXT,
  requirement_id TEXT,
  status TEXT DEFAULT 'received',
  response_text TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brand_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  firm_name TEXT,
  tagline TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#d4a853',
  default_tone TEXT DEFAULT 'professional',
  default_target_audience TEXT,
  website_url TEXT,
  email TEXT,
  phone TEXT,
  line_id TEXT,
  address TEXT,
  facebook_bio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO brand_profile (id, created_at, updated_at)
VALUES ('default', NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL
);

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('openai_api_key', '', NOW()::TEXT),
  ('openai_model', 'gpt-4o', NOW()::TEXT),
  ('default_timezone', 'Asia/Bangkok', NOW()::TEXT),
  ('hermes_poll_interval', '45', NOW()::TEXT),
  ('default_word_count', '1000', NOW()::TEXT),
  ('default_content_type', 'post', NOW()::TEXT),
  ('hermes_system_prompt', '', NOW()::TEXT),
  ('anthropic_api_key', '', NOW()::TEXT),
  ('hermes_model', '', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'url',
  name TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  last_indexed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ─── Row Level Security ────────────────────────────────────────────────────
-- service_role key bypasses RLS automatically.
-- anon key: allow all (single-user app, no auth in Phase A).

ALTER TABLE facebook_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON facebook_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON creative_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rag_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON content_outputs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON image_prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON video_prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON calendar_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON command_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON brand_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON knowledge_sources FOR ALL USING (true) WITH CHECK (true);
