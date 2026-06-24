# HERMES — Worker Agent Instructions

> **Version:** 1.0 | **Project:** Law AI Content OS | **Runtime:** Node.js (tsx)

---

## Role

Hermes คือ background worker ที่รับ content requirement จาก Next.js app แล้วสร้าง content ครบวงจรโดยอัตโนมัติ

Hermes **ไม่ใช่ LLM agent** — เป็น orchestrator ที่เรียก OpenAI API เป็น steps และ save output กลับไปที่ SQLite

---

## Pipeline (5 Steps)

```
[Queue] → Step 1: Auto-topic (ถ้า topic ว่าง)
        → Step 2: RAG Search (ค้น Obsidian vault)
        → Step 3: Content Generation (OpenAI → JSON)
        → Step 4: Image Prompt Generation (OpenAI → JSON)
        → Step 5: Video Brief (optional, ถ้า video_create = 1)
        → Save output → Job done
```

### Step 1: Auto-topic
- ถ้า `requirement.topic` ว่าง → อ่าน `หมวดหมู่กฎหมาย:` จาก brief
- ค้น RAG ด้วย category → เอา note title อันดับ 1 เป็น topic
- PATCH topic กลับ DB ก่อนดำเนินการต่อ

### Step 2: RAG Search
- ค้น `api/local/rag/search` ด้วย topic
- ต้องได้ผล >= 2 sources — ถ้าน้อยกว่า → status `needs_research` → หยุด
- ผล RAG inject เข้า content prompt เป็น context

### Step 3: Content Generation
- Model: จาก `app_settings.openai_model` (default: gpt-4o)
- System prompt: inject `hermes_system_prompt` จาก `app_settings` + Brand Profile
- Output JSON: `{ title, hook, caption, body, cta, hashtags, compliance_note }`
- Word count: enforce minimum จาก brief (`ความยาวเนื้อหา: X คำ`)

### Step 4: Image Prompt
- สร้าง prompt สำหรับ DALL-E 3, Midjourney, Adobe Firefly
- ใช้ Creative Profile ถ้ากำหนดไว้
- Output JSON: `{ main_prompt, dalle_prompt, text_overlay, negative_prompt, layout_spec, canvas_size, brand_style }`

### Step 5: Video Brief (optional)
- ทำเฉพาะ `video_create = 1`
- Output JSON: scene breakdown, voiceover script, visual prompts, music mood

---

## Status Flow

```
pending → running → rag_searching → content_generating
       → image_prompt_generating → [video_prompt_generating]
       → done

ถ้าผิดพลาด:
pending → running → needs_research  (RAG ไม่พอ)
       → failed                     (error อื่นๆ)
```

---

## Context Injection Priority

เมื่อสร้าง prompt สำหรับ OpenAI:

1. **`hermes_system_prompt`** (app_settings) — highest priority, user-editable persona
2. **Brand Profile** — ชื่อสำนักงาน, tone, สี, target audience
3. **Requirement brief** — law category, goals, key message, CTA
4. **RAG context** — Obsidian vault notes

---

## Rules (ห้ามทำ)

- ❌ Self-approve หรือ publish content โดยอัตโนมัติ — content ต้องผ่าน human review ก่อน
- ❌ Hallucinate กฎหมาย — ถ้า RAG ไม่มีข้อมูล ให้ระบุใน `compliance_note`
- ❌ Skip word count minimum — enforce `อย่างน้อย X คำ ห้ามสั้นกว่า`
- ❌ ใช้ API key จาก hardcode — ต้องมาจาก `OPENAI_API_KEY` env หรือ `app_settings.openai_api_key` DB

---

## Config (ปรับผ่าน Settings UI)

| Setting | DB Key | Default |
|---------|--------|---------|
| OpenAI API Key | `openai_api_key` | — |
| Model | `openai_model` | gpt-4o |
| Poll interval | `hermes_poll_interval` | 45s |
| Timezone | `default_timezone` | Asia/Bangkok |
| Custom persona | `hermes_system_prompt` | (empty) |

---

## Start

```bash
pnpm hermes
# หรือ
npx tsx --env-file .env.local hermes/worker.ts
```

---

## File Structure

```
hermes/
  worker.ts       — main loop + all pipeline steps + prompt builders
  HERMES.md       — this file
  prompts/        — (reserved) external prompt files
  steps/          — (reserved) modular step functions
```
