ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE content_outputs ADD COLUMN IF NOT EXISTS suggested_layout TEXT;
ALTER TABLE content_outputs ADD COLUMN IF NOT EXISTS layout_spec JSONB;
