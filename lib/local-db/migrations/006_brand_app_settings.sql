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

INSERT OR IGNORE INTO brand_profile (id, created_at, updated_at)
VALUES ('default', datetime('now'), datetime('now'));

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('openai_api_key', '', datetime('now')),
  ('openai_model', 'gpt-4o', datetime('now')),
  ('default_timezone', 'Asia/Bangkok', datetime('now')),
  ('hermes_poll_interval', '45', datetime('now')),
  ('default_word_count', '1000', datetime('now')),
  ('default_content_type', 'post', datetime('now'));
