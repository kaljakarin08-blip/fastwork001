CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON rag_chunks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);
