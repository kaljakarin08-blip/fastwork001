CREATE TABLE IF NOT EXISTS creative_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color_scheme TEXT,
  photography_style TEXT,
  logo_usage TEXT,
  visual_mood TEXT,
  do_not_use TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE requirements ADD COLUMN creative_profile_id TEXT REFERENCES creative_profiles(id);
