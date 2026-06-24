# CODEX TASK — Hermes Pipeline V2: URL Fetch + Auto Layout + Vercel Cron

## Context
- Orchestrator: Claude Code
- Project: law-content-v2 (`/Users/jakarinosk/HEAD-OFFICE/PROJECTS/law-content-v2`)
- อ่าน AGENTS.md ในโปรเจกต์ก่อนเริ่ม

## Goal
อัปเกรด Hermes pipeline 5 จุด:
1. เพิ่ม `source_url` field ใน requirements
2. Topic Guard อ่าน URL content + auto-suggest layout
3. RAG Search รวม URL content เป็น context
4. Image Prompt ระบุ Facebook layout spec ชัดเจน
5. Vercel Cron endpoint แทน long-running worker

---

## Scope — แตะได้เท่านี้

```
supabase/migrations/003_add_source_url.sql   ← สร้างใหม่
types/index.ts                               ← เพิ่ม field
hermes/worker.ts                             ← อัปเกรด
app/api/hermes/run/route.ts                  ← สร้างใหม่ (folder ใหม่)
vercel.json                                  ← สร้างใหม่
```

## DO NOT TOUCH
- `app/api/local/` ทุกไฟล์
- `lib/agents/`, `lib/supabase/`, `components/`, `electron/`

---

## Implementation

### 1. `supabase/migrations/003_add_source_url.sql`
```sql
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS suggested_layout TEXT;
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS layout_spec JSONB;
```
> Apply ใน Supabase SQL Editor แล้ว commit ไฟล์

---

### 2. `types/index.ts`

เพิ่มใน interface `Requirement`:
```ts
source_url: string | null
```

เพิ่ม interface ใหม่:
```ts
export interface LayoutSpec {
  key: string
  size: string
  ratio: string
  safe_zone: string
  dalle_size: string
}
```

เพิ่มใน interface `Output` (หรือ interface ที่เก็บ output fields):
```ts
suggested_layout: string | null
layout_spec: LayoutSpec | null
```

---

### 3. `hermes/worker.ts`

#### 3a. เพิ่ม LAYOUT_SPEC constant (ก่อน processJob)
```ts
const LAYOUT_SPEC: Record<string, { key: string; size: string; ratio: string; safe_zone: string; dalle_size: string }> = {
  feed_square:   { key: 'feed_square',   size: '1200×1200', ratio: '1:1',   safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1024x1024' },
  feed_vertical: { key: 'feed_vertical', size: '960×1200',  ratio: '4:5',   safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1024x1024' },
  feed_link:     { key: 'feed_link',     size: '1200×628',  ratio: '1.9:1', safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1792x1024' },
  story:         { key: 'story',         size: '1080×1920', ratio: '9:16',  safe_zone: 'text ไม่เกิน 30% ของพื้นที่', dalle_size: '1024x1792' },
  album_cover:   { key: 'album_cover',   size: '1280×1920', ratio: '2:3',   safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1024x1792' },
}
const DEFAULT_LAYOUT = 'feed_square'
```

#### 3b. เพิ่ม helper `fetchUrlContent`
```ts
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LawAIBot/2.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)
  } catch {
    return ''
  }
}
```

#### 3c. แทนที่ Step 2 (Topic Guard) ทั้งหมดด้วย:
```ts
// fetch URL ก่อน guard — ใช้ซ้ำใน Step 3
let urlContent = ''
const sourceUrl = String(requirement.source_url ?? '')
if (sourceUrl.startsWith('http')) {
  urlContent = await fetchUrlContent(sourceUrl)
}

const guardRaw = await llm(
  `คุณเป็น gatekeeper + layout advisor สำหรับ AI Content ของสำนักงานกฎหมาย
ตรวจสอบว่า topic เกี่ยวกับ (1) กฎหมายไทย หรือ (2) legal content เท่านั้น
พร้อม suggest layout ที่เหมาะสม

Layout ที่มี:
- feed_square (1:1) — tips, checklist, numbered list ทั่วไป
- feed_vertical (4:5) — article, long content, บทความยาว
- feed_link (1.9:1) — แชร์ link, banner แนวนอน
- story (9:16) — story, reels
- album_cover (2:3) — album post แรก

ตอบ JSON เท่านั้น:
{ "ok": true, "reason": "...", "suggested_layout": "feed_square", "layout_reason": "เหตุผลสั้น" }`,
  `Topic: ${requirement.topic}
Brief: ${String(requirement.brief ?? '').slice(0, 300)}
${urlContent ? `\nURL Content (ย่อ):\n${urlContent.slice(0, 800)}` : ''}`
).catch(() => '{"ok":true,"reason":"guard_error","suggested_layout":"feed_square","layout_reason":"default"}')

let guardResult: { ok: boolean; reason?: string; suggested_layout?: string; layout_reason?: string } = {
  ok: true, suggested_layout: DEFAULT_LAYOUT,
}
try { guardResult = JSON.parse(guardRaw) } catch { /* pass */ }

if (!guardResult.ok) {
  await updateJobStatus(jobId, 'failed', `off_topic: ${guardResult.reason ?? 'ไม่เกี่ยวกับกฎหมาย'}`)
  await updateReqStatus(reqId, 'failed')
  return
}

const suggestedLayoutKey = LAYOUT_SPEC[String(requirement.layout_requirement ?? '')]
  ? String(requirement.layout_requirement)
  : (guardResult.suggested_layout ?? DEFAULT_LAYOUT)
const layoutSpec = LAYOUT_SPEC[suggestedLayoutKey] ?? LAYOUT_SPEC[DEFAULT_LAYOUT]
console.log(`[hermes] Layout: ${suggestedLayoutKey} — ${guardResult.layout_reason ?? ''}`)
```

#### 3d. Step 3 — รวม URL content กับ RAG
หลัง `const ragContext = sources.map(s => s.content).join(...)` เพิ่ม:
```ts
const combinedContext = [
  ragContext,
  urlContent ? `\n\n=== เนื้อหาจาก URL อ้างอิง ===\n${urlContent}` : '',
].join('').trim()
```
แล้วใช้ `combinedContext` แทน `ragContext` ใน buildContentPrompt() call

#### 3e. Step 5 — inject layout spec ใน imageSystemPrompt
```ts
const layoutInstruction = `\nFacebook Image Spec: layout=${layoutSpec.key}, ขนาด=${layoutSpec.size}, ratio=${layoutSpec.ratio}, ${layoutSpec.safe_zone}, brand primary=${brand.primaryColor}, secondary=${brand.secondaryColor}`
// ต่อท้าย imageSystemPrompt ก่อน call llm
const imageSystemPromptFull = imageSystemPrompt + layoutInstruction
```
แล้วใช้ `imageSystemPromptFull` แทน `imageSystemPrompt`

#### 3f. Step 6 — เพิ่ม field ใน POST body
```ts
suggested_layout: suggestedLayoutKey,
layout_spec: layoutSpec,
```

---

### 4. `app/api/hermes/run/route.ts` (สร้างใหม่)

Vercel Cron เรียก route นี้ทุก 1 นาที รัน 1 pending job

```ts
import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { getSetting } from '@/lib/local-db/get-setting'
import OpenAI from 'openai'

export const maxDuration = 60

export async function GET() {
  const sb = getSupabase()

  // ดึง 1 pending job พร้อม requirement
  const { data: jobs } = await sb
    .from('jobs')
    .select('id, requirement_id, requirements(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: null })
  }

  const row = jobs[0] as any
  const jobId: string = row.id
  const reqId: string = row.requirement_id
  const req = row.requirements as any

  // mark running
  const now = new Date().toISOString()
  await sb.from('jobs').update({ status: 'running', started_at: now }).eq('id', jobId)
  await sb.from('requirements').update({ status: 'content_generating' }).eq('id', reqId)

  try {
    const openaiKey = await getSetting('openai_api_key', 'OPENAI_API_KEY')
    if (!openaiKey) throw new Error('OpenAI API key ไม่ได้ตั้งค่า')

    // Inline processJob — ดู hermes/worker.ts สำหรับ logic ครบ
    // สำหรับ V1: เรียกผ่าน APP_URL เพื่อ reuse worker logic
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://law-content-v2.vercel.app'
    const res = await fetch(`${appUrl}/api/hermes/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal': '1' },
      body: JSON.stringify({ jobId, reqId, requirement: req }),
    }).catch(() => null)

    if (!res?.ok) throw new Error('process route failed')
    return NextResponse.json({ ok: true, processed: jobId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sb.from('jobs').update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() }).eq('id', jobId)
    await sb.from('requirements').update({ status: 'failed' }).eq('id', reqId)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
```

**หมายเหตุ:** ถ้า pattern นี้ซับซ้อนเกิน ให้ inline logic ทั้งหมดใน route นี้โดยตรง (copy processJob จาก worker.ts แล้วปรับให้ใช้ Supabase โดยตรงแทน fetch loop)

---

### 5. `vercel.json` (สร้างใหม่)
```json
{
  "crons": [
    {
      "path": "/api/hermes/run",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## Quality Gate
```bash
pnpm typecheck   # 0 errors
pnpm build       # pass
```

## STOP WHEN
implement ครบ → typecheck + build pass → เขียน `TASK_RESULT.md` → STOP ✋
