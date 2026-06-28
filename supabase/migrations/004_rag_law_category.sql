-- Migration 004: เพิ่ม law_category ใน knowledge_sources
-- ทนายสามารถ tag URL source ตามหมวดหมู่กฎหมาย
-- worker.ts จะ query URL ตาม category และ fetch content ก่อนสร้าง prompt

ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS law_category text;

COMMENT ON COLUMN knowledge_sources.law_category IS
  'หมวดหมู่กฎหมายที่ URL นี้ครอบคลุม เช่น แรงงาน, อาญา, ภาษีและบัญชี — worker.ts ใช้ query fallback URL';
