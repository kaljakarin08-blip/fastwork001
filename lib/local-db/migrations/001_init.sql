CREATE TABLE IF NOT EXISTS facebook_accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_id TEXT,
  brand_voice TEXT,
  default_timezone TEXT DEFAULT 'Asia/Bangkok',
  default_posting_slots TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
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
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rag_sources (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  note_path TEXT NOT NULL,
  note_title TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  relevance_score REAL DEFAULT 0.5,
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
