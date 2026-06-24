ALTER TABLE facebook_accounts ADD COLUMN page_access_token TEXT;
ALTER TABLE facebook_accounts ADD COLUMN token_expires_at TEXT;

ALTER TABLE calendar_items ADD COLUMN fb_post_id TEXT;
ALTER TABLE calendar_items ADD COLUMN published_at TEXT;

ALTER TABLE image_prompts ADD COLUMN generated_image_url TEXT;
