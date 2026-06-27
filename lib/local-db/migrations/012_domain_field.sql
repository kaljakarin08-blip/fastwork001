-- Migration 012: เพิ่ม domain field ใน requirements และ rag index
-- domain: 'law' | 'accounting' | 'general'

ALTER TABLE requirements ADD COLUMN domain TEXT NOT NULL DEFAULT 'law';

-- Index สำหรับ filter by domain
CREATE INDEX IF NOT EXISTS idx_requirements_domain ON requirements(domain);

-- อัปเดต requirements ที่มีอยู่แล้ว ให้ดู keyword จาก brief/topic
-- (ทำ best-effort ผ่าน worker ทีหลัง ตอนนี้ default = 'law')
