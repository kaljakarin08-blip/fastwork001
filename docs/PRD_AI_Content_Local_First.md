# PRD: AI Content Requirement & Local RAG Production System

## 1. Product Name

**Law AI Content OS — Local-First Requirement & Content Production System**

## 2. Objective

สร้างระบบสำหรับรับ Requirement จากลูกค้า แล้วให้ระบบค้นหาข้อมูลจาก Local RAG / Obsidian เพื่อสร้าง:

- Content text สำหรับ Facebook
- Image prompt
- Layout specification
- Video prompt / video brief ถ้ามีการเลือก `Video Create`
- Calendar preparation สำหรับเลือกวันโพสต์เอง
- รองรับหลาย Facebook accounts / pages ที่ลูกค้าดูแล 4-5 accounts
- รองรับคำสั่งผ่าน Telegram ก่อน และ LINE ใน phase ถัดไป

ระบบนี้ต้องรันแบบ **Local-first** โดยยังไม่ใช้ Supabase หรือ Cloud ในช่วงแรก จนกว่า workflow จะนิ่ง

---

## 3. Background

ลูกค้ามี dashboard web อยู่แล้ว และต้องการเปลี่ยนระบบจาก Auto Publish เป็นระบบเตรียมคอนเทนต์แบบมี Requirement ชัดเจน โดยให้ AI ช่วยผลิตเนื้อหาและ prompt สำหรับภาพ/วิดีโอ ก่อนให้ผู้ใช้ตรวจและเลือกวันโพสต์เอง

ระบบควรเชื่อมกับ Hermes และ Codex runtime ที่ติดตั้งในเครื่องลูกค้า เพื่อให้ลูกค้าไม่ต้องซื้อ API นอกสำหรับงาน text/content/RAG ยกเว้นกรณีที่ต้องสร้างวิดีโอจริง ซึ่งลูกค้าจะซื้อ Video API เอง

---

## 4. Core Concept

หนึ่ง Requirement = หนึ่งหน่วยงานที่ประกอบด้วย:

```text
Topic + Content Brief + Image Prompt Direction + Layout Requirement + Target Facebook Account + Optional Video Create
```

จากนั้น Hermes จะรับงานต่อ:

```text
Requirement
→ Search Local RAG
→ If knowledge missing, call Codex to collect/prepare Obsidian notes
→ Generate content text
→ Generate image prompt
→ Generate layout spec
→ Optional: generate video brief / send to video API
→ Save output
→ Show on dashboard
→ User selects Facebook account/page and post date
```

---

## 5. Users / Roles

### 5.1 Admin / Operator

ใช้โดยคุณหรือลูกค้าฝั่งดูแลระบบ

Responsibilities:

- สร้าง Requirement
- ตรวจ output
- เลือก Facebook account/page
- เลือกวันโพสต์
- Approve / Reject / Revise
- ดู queue และ error logs

### 5.2 Client Reviewer

ใช้ตรวจเนื้อหา

Responsibilities:

- อ่าน content draft
- ตรวจ image prompt/layout
- อนุมัติหรือขอแก้ไข

### 5.3 Hermes Worker

ไม่ใช่ user interface แต่เป็น local worker process

Responsibilities:

- อ่าน queue
- ค้น RAG
- เรียก Codex ถ้าข้อมูลไม่พอ
- สร้าง output
- update local database

### 5.4 Codex Runtime

ใช้เป็น AI worker ของลูกค้า

Responsibilities:

- ช่วย research
- จัดข้อมูลลง Obsidian
- เตรียม RAG-ready notes
- สรุปข้อมูลจากไฟล์/source

---

## 6. Functional Requirements

## FR-001: Requirement Form

ระบบต้องมีหน้า form สำหรับสร้าง Requirement ใหม่

Fields:

```text
- requirement_title
- topic
- content_brief
- target_audience
- objective
- content_tone
- platform: Facebook default
- facebook_account_id / facebook_page_id
- content_type: post / carousel / short_video / reel_script
- image_prompt_direction
- layout_requirement
- video_create: boolean
- video_style
- video_duration
- preferred_post_date
- preferred_post_time
- priority
- notes
```

Acceptance Criteria:

- Submit แล้วบันทึกลง local SQLite
- status เริ่มต้นเป็น `requested`
- ถ้าไม่ได้เลือก Facebook account ต้องขึ้นสถานะ `missing_facebook_target`
- ถ้า video_create = true ต้องสร้าง video task เพิ่ม

---

## FR-002: Facebook Account / Page Selector

ระบบต้องรองรับหลาย Facebook accounts/pages

Fields:

```text
facebook_accounts
- id
- account_name
- page_name
- page_id
- brand_voice
- default_timezone
- default_posting_slots
- status
- notes
```

Behavior:

- Requirement ทุกอันต้องเลือก account/page ปลายทาง
- Calendar ต้อง filter ตาม Facebook account/page ได้
- Content output ต้องแสดงว่าใช้สำหรับ account/page ไหน
- ระบบต้องไม่ publish จริงใน MVP แรก แต่เตรียมข้อมูลสำหรับ publish

---

## FR-003: Local Queue

เมื่อมี Requirement ใหม่ ระบบต้องสร้าง queue item ให้ Hermes ทำงาน

Statuses:

```text
requested
validating
rag_searching
needs_research
codex_researching
obsidian_updated
rag_indexing
rag_ready
content_generating
content_ready
image_prompt_generating
image_prompt_ready
video_prompt_generating
video_prompt_ready
video_submitted
video_rendering
video_ready
output_ready
review_pending
revision_requested
approved
scheduled
exported
failed
```

Acceptance Criteria:

- Dashboard แสดงสถานะของแต่ละ Requirement ได้
- Hermes update status กลับเข้า local DB ได้
- Error ต้องถูกบันทึกใน job_logs

---

## FR-004: Local RAG Search

ระบบต้องค้นข้อมูลจาก Local RAG ก่อน generate content

Sources:

```text
- Obsidian markdown vault
- RAG-ready notes
- Client briefs
- Previous approved content
- Legal/accounting source notes
```

Acceptance Criteria:

- Output ต้องมี source note references
- ถ้าค้นไม่เจอข้อมูลเพียงพอ ต้องตั้ง status เป็น `needs_research`
- Hermes ต้องสั่ง Codex ไปเตรียมข้อมูลเพิ่มลง Obsidian

---

## FR-005: Codex Research to Obsidian

ถ้า RAG ไม่มีข้อมูลพอ Hermes ต้องสร้าง task ให้ Codex

Codex Task:

```text
- อ่าน requirement
- หาข้อมูลจาก source ที่ผู้ใช้ให้ / local files / notes
- สรุปเป็น markdown
- เขียนลง Obsidian folder ที่กำหนด
- ใส่ metadata ให้พร้อม index
```

Acceptance Criteria:

- Note ใหม่ต้องมี frontmatter
- Note ต้องอยู่ใน `/05_RAG_Ready`
- หลังจาก Codex เขียน note แล้ว ระบบต้อง re-index RAG

---

## FR-006: Content Text Generator

ระบบต้องสร้าง text สำหรับ Facebook

Output:

```text
- title
- hook
- caption
- body
- CTA
- hashtags
- compliance_note
- source_notes_used
```

Acceptance Criteria:

- ภาษาไทยต้องอ่านง่าย
- ต้องไม่อ้างข้อกฎหมายแบบมั่นใจเกิน source
- ถ้าข้อมูลเสี่ยง ต้อง mark `compliance_review_required`

---

## FR-007: Image Prompt Generator

ระบบต้องสร้าง image prompt และ layout spec

Output:

```text
- main_visual_prompt
- text_overlay
- negative_prompt
- layout_spec
- canvas_size
- safe_margin
- brand_style
- typography_instruction
```

Acceptance Criteria:

- รองรับ Facebook 1:1 เป็น default
- ข้อความไทยในภาพต้องสั้น
- Layout ต้องแยกออกจาก prompt เพื่อให้แก้ได้ง่าย

---

## FR-008: Video Create Optional

ถ้า user ติ๊ก `Video Create` ระบบต้องสร้าง video brief

Output:

```text
- video_title
- duration
- hook
- scene_breakdown
- voiceover_script
- visual_prompt_per_scene
- subtitle_text
- CTA
- video_api_status
```

Acceptance Criteria:

- ยังไม่ต้อง generate video ถ้ายังไม่ได้ตั้งค่า Video API
- ถ้ามี API key แล้วจึง submit ไป video API
- ต้องเป็น async job ไม่ทำให้หน้า dashboard ค้าง

---

## FR-009: Dashboard Output Review

ระบบต้องมีหน้าดู output ของแต่ละ Requirement

Sections:

```text
- Requirement Summary
- Facebook Account/Page Target
- RAG Sources Used
- Content Text
- Image Prompt
- Layout Spec
- Video Brief / Video Status
- Calendar/Schedule
- Approve / Reject / Request Revision
```

---

## FR-010: Calendar Preparation

ผู้ใช้ต้องเลือกวันโพสต์เองได้

Features:

```text
- Calendar month view
- List view
- Filter by Facebook account/page
- Filter by status
- Drag/drop optional
- Manual date/time edit
- Mark as scheduled/prepared
```

MVP ไม่ต้อง publish จริง

---

## FR-011: Telegram Command

รองรับ Telegram ก่อน LINE

Commands:

```text
/newreq <topic>
/status <requirement_id>
/list today
/approve <requirement_id>
/schedule <requirement_id> <YYYY-MM-DD> <HH:mm> <facebook_account_alias>
/reject <requirement_id> <reason>
```

---

## FR-012: LINE Command

LINE ทำใน phase ถัดไป เพราะ local-first จะติด webhook public URL

Options:

```text
- ngrok tunnel
- cloudflared tunnel
- ย้ายขึ้น cloud ภายหลัง
```

---

## 7. Non-Functional Requirements

```text
- Local-first
- No Supabase in MVP
- No cloud dependency except optional Video API
- SQLite local database
- Obsidian as knowledge base
- RAG index local
- Human approval before publish
- Audit log required
- Exportable data
```

---

## 8. Local Database Tables

### requirements

```sql
id TEXT PRIMARY KEY,
title TEXT,
topic TEXT,
brief TEXT,
target_audience TEXT,
objective TEXT,
tone TEXT,
platform TEXT DEFAULT 'facebook',
facebook_account_id TEXT,
content_type TEXT,
image_direction TEXT,
layout_requirement TEXT,
video_create INTEGER DEFAULT 0,
video_style TEXT,
video_duration INTEGER,
preferred_post_date TEXT,
preferred_post_time TEXT,
priority TEXT DEFAULT 'normal',
status TEXT DEFAULT 'requested',
created_at TEXT,
updated_at TEXT
```

### facebook_accounts

```sql
id TEXT PRIMARY KEY,
account_name TEXT,
page_name TEXT,
page_id TEXT,
brand_voice TEXT,
default_timezone TEXT,
default_posting_slots TEXT,
status TEXT DEFAULT 'active',
notes TEXT,
created_at TEXT,
updated_at TEXT
```

### jobs

```sql
id TEXT PRIMARY KEY,
requirement_id TEXT,
job_type TEXT,
status TEXT,
attempt_count INTEGER DEFAULT 0,
error_message TEXT,
started_at TEXT,
completed_at TEXT,
created_at TEXT
```

### rag_sources

```sql
id TEXT PRIMARY KEY,
requirement_id TEXT,
note_path TEXT,
note_title TEXT,
chunk_id TEXT,
relevance_score REAL,
used_in_output INTEGER DEFAULT 0,
created_at TEXT
```

### content_outputs

```sql
id TEXT PRIMARY KEY,
requirement_id TEXT,
title TEXT,
hook TEXT,
caption TEXT,
body TEXT,
cta TEXT,
hashtags TEXT,
compliance_note TEXT,
status TEXT,
created_at TEXT,
updated_at TEXT
```

### image_prompts

```sql
id TEXT PRIMARY KEY,
requirement_id TEXT,
main_prompt TEXT,
text_overlay TEXT,
negative_prompt TEXT,
layout_spec TEXT,
canvas_size TEXT,
safe_margin TEXT,
brand_style TEXT,
status TEXT,
created_at TEXT,
updated_at TEXT
```

### video_prompts

```sql
id TEXT PRIMARY KEY,
requirement_id TEXT,
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
status TEXT,
created_at TEXT,
updated_at TEXT
```

### calendar_items

```sql
id TEXT PRIMARY KEY,
requirement_id TEXT,
facebook_account_id TEXT,
post_date TEXT,
post_time TEXT,
status TEXT,
notes TEXT,
created_at TEXT,
updated_at TEXT
```

### command_logs

```sql
id TEXT PRIMARY KEY,
source TEXT,
command_text TEXT,
parsed_action TEXT,
requirement_id TEXT,
status TEXT,
response_text TEXT,
created_at TEXT
```

---

## 9. MVP Scope

### Included

```text
- Requirement form
- Facebook account selector
- Local SQLite queue
- Hermes worker integration
- Obsidian/RAG local search
- Content text generation
- Image prompt generation
- Optional video prompt generation
- Calendar preparation
- Telegram command basic
```

### Excluded for MVP

```text
- Auto publish to Facebook
- Supabase/cloud sync
- LINE webhook production
- Multi-user permission system
- Billing
- Full analytics dashboard
```

---

## 10. Success Criteria

```text
- User can create requirement from dashboard
- User can select target Facebook account/page
- Hermes can process requirement locally
- RAG source is visible in output
- Content text and image prompt are generated
- Video prompt generated only when video_create=true
- User can manually choose post date
- Telegram can query status
- No Supabase/cloud required in MVP
```
