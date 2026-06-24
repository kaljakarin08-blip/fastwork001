ALTER TABLE creative_profiles ADD COLUMN reference_image_urls TEXT;

ALTER TABLE calendar_items ADD COLUMN image_url TEXT;
ALTER TABLE calendar_items ADD COLUMN caption_override TEXT;
ALTER TABLE calendar_items ADD COLUMN scheduled_status TEXT DEFAULT 'pending';
