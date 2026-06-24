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
