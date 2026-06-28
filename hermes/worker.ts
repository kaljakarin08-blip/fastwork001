import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getSupabase } from '@/lib/supabase/admin'

function loadLocalEnvFile(filename: string) {
  const fullPath = path.join(process.cwd(), filename)
  if (!fs.existsSync(fullPath)) return

  const lines = fs.readFileSync(fullPath, 'utf8').split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIndex = line.indexOf('=')
    if (eqIndex <= 0) continue
    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadLocalEnvFile('.env.local')
loadLocalEnvFile('.env')

const APP_URL = process.env.HERMES_APP_URL ?? 'http://localhost:3000'
const INTERVAL = parseInt(process.env.HERMES_POLL_INTERVAL_SECONDS ?? '45') * 1000
const DEFAULT_LAYOUT = 'feed_square'

const LAYOUT_SPEC: Record<string, { key: string; size: string; ratio: string; safe_zone: string; dalle_size: string }> = {
  feed_square: { key: 'feed_square', size: '1200x1200', ratio: '1:1', safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1024x1024' },
  feed_vertical: { key: 'feed_vertical', size: '960x1200', ratio: '4:5', safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1024x1024' },
  feed_link: { key: 'feed_link', size: '1200x628', ratio: '1.9:1', safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1792x1024' },
  story: { key: 'story', size: '1080x1920', ratio: '9:16', safe_zone: 'text ไม่เกิน 30% ของพื้นที่', dalle_size: '1024x1792' },
  album_cover: { key: 'album_cover', size: '1280x1920', ratio: '2:3', safe_zone: 'text ไม่เกิน 20% ของพื้นที่', dalle_size: '1024x1792' },
}

interface BrandContext {
  firmName: string
  tagline: string
  tone: string
  targetAudience: string
  primaryColor: string
  secondaryColor: string
  phone: string
  email: string
  lineId: string
  websiteUrl: string
  systemPrompt: string
  model: string
  anthropicKey: string
  openaiKey: string
}

async function loadBrandContext(appUrl = APP_URL): Promise<BrandContext> {
  const defaults: BrandContext = {
    firmName: 'สำนักงานกฎหมาย',
    tagline: '',
    tone: 'professional',
    targetAudience: 'เจ้าของธุรกิจและประชาชนทั่วไป',
    primaryColor: '#1e3a5f',
    secondaryColor: '#d4a853',
    phone: '',
    email: '',
    lineId: '',
    websiteUrl: '',
    systemPrompt: '',
    model: 'gpt-4o',
    anthropicKey: '',
    openaiKey: '',
  }
  try {
    const [brandRes, settingsRes] = await Promise.all([
      fetch(`${appUrl}/api/local/brand-profile`).catch(() => null),
      fetch(`${appUrl}/api/local/app-settings`).catch(() => null),
    ])
    const brand = brandRes?.ok ? await brandRes.json() : {}
    const settings = settingsRes?.ok ? await settingsRes.json() : {}
    // hermes_model overrides openai_model when set
    const model = settings.hermes_model || settings.openai_model || defaults.model
    return {
      firmName: brand.firm_name || defaults.firmName,
      tagline: brand.tagline || '',
      tone: brand.default_tone || defaults.tone,
      targetAudience: brand.default_target_audience || defaults.targetAudience,
      primaryColor: brand.primary_color || defaults.primaryColor,
      secondaryColor: brand.secondary_color || defaults.secondaryColor,
      phone: brand.phone || '',
      email: brand.email || '',
      lineId: brand.line_id || '',
      websiteUrl: brand.website_url || '',
      systemPrompt: settings.hermes_system_prompt || '',
      model,
      anthropicKey: settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '',
      openaiKey: settings.openai_api_key || process.env.OPENAI_API_KEY || '',
    }
  } catch {
    return defaults
  }
}

// ─── Multi-provider LLM abstraction ────────────────────────────────────────

type MsgImageContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

async function callLLM(opts: {
  model: string
  system: string
  user: string | MsgImageContent[]
  openaiKey: string
  anthropicKey: string
  maxTokens?: number
}): Promise<string> {
  const { model, system, user, openaiKey, anthropicKey, maxTokens } = opts

  // ── Anthropic (Claude) ──────────────────────────────────────────────────
  if (model.startsWith('claude-')) {
    const client = new Anthropic({ apiKey: anthropicKey })

    let userContent: Anthropic.MessageParam['content']
    if (typeof user === 'string') {
      userContent = user
    } else {
      userContent = user.map(c => {
        if (c.type === 'text') return { type: 'text' as const, text: c.text }
        return {
          type: 'image' as const,
          source: { type: 'url' as const, url: c.image_url.url },
        }
      })
    }

    const res = await client.messages.create({
      model,
      max_tokens: maxTokens ?? 4096,
      system,
      messages: [{ role: 'user', content: userContent }],
    })

    const block = res.content[0]
    return block.type === 'text' ? block.text : '{}'
  }

  // ── OpenAI (gpt-4o, gpt-4.1, o3, o4-mini, …) ──────────────────────────
  const openai = new OpenAI({ apiKey: openaiKey })
  const isOSeries = /^o\d/.test(model)

  const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: typeof user === 'string'
          ? user
          : (user as OpenAI.Chat.ChatCompletionContentPart[]),
      },
    ],
    response_format: { type: 'json_object' },
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  }
  if (!isOSeries) params.temperature = 0.7

  const res = await openai.chat.completions.create(params)
  return res.choices[0]?.message?.content ?? '{}'
}

// ─── DALL-E 3 image generation ─────────────────────────────────────────────

async function generateImage(prompt: string, openaiKey: string, layout = 'square_1x1'): Promise<string | null> {
  const sizeMap: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
    square_1x1: '1024x1024',
    landscape_16x9: '1792x1024',
    portrait_4x5: '1024x1792',
    story_9x16: '1024x1792',
    feed_square: '1024x1024',
    feed_vertical: '1024x1024',
    feed_link: '1792x1024',
    story: '1024x1792',
    album_cover: '1024x1792',
  }
  const size = sizeMap[layout] ?? '1024x1024'

  const openai = new OpenAI({ apiKey: openaiKey })
  const res = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt.slice(0, 4000),
    n: 1,
    size,
    quality: 'standard',
  })

  // Use URL if b64_json not returned (API version difference)
  const imageUrl = res.data?.[0]?.url
  if (!imageUrl) return null

  // Download image then upload to Supabase Storage (Vercel has read-only FS)
  const imgRes = await fetch(imageUrl)
  const arrayBuf = await imgRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)
  const filename = `img_${Date.now()}.png`

  const sb = getSupabase()
  const { error: uploadError } = await sb.storage.from('uploads').upload(filename, buffer, {
    contentType: 'image/png',
    upsert: false,
  })
  if (uploadError) {
    console.warn(`[hermes] Supabase upload failed: ${uploadError.message}`)
    return null
  }
  const { data: { publicUrl } } = sb.storage.from('uploads').getPublicUrl(filename)
  return publicUrl
}

// ─── Auto-schedule helper ──────────────────────────────────────────────────

async function autoSchedule(reqId: string, facebookAccountId: string, appUrl = APP_URL) {
  await fetch(`${appUrl}/api/local/calendar/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirement_id: reqId,
      facebook_account_id: facebookAccountId,
      auto_random: true,
      skip_days: 0,
      weekday_only: true,
      time_start: 9,
      time_end: 18,
    }),
  }).catch(() => null)
}

async function updateJobStatus(jobId: string, status: string, error?: string, appUrl = APP_URL) {
  await fetch(`${appUrl}/api/local/hermes/jobs/${jobId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, error_message: error }),
  }).catch(() => null)
}

async function updateReqStatus(reqId: string, status: string, appUrl = APP_URL) {
  await fetch(`${appUrl}/api/local/requirements/${reqId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => null)
}

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
      .slice(0, 8000)
  } catch {
    return ''
  }
}

export async function processJob(job: Record<string, unknown>, requirement: Record<string, unknown>, appUrl = APP_URL) {
  const jobId = job.id as string
  const reqId = requirement.id as string
  const brand = await loadBrandContext(appUrl)
  const sb = getSupabase()
  const openaiKey = brand.openaiKey
  const llm = (system: string, user: string | MsgImageContent[]) =>
    callLLM({ model: brand.model, system, user, openaiKey, anthropicKey: brand.anthropicKey })
  // High-token variant for content generation (body 1000–1500 คำ needs ~8k+ tokens)
  const llmLong = (system: string, user: string | MsgImageContent[]) =>
    callLLM({ model: brand.model, system, user, openaiKey, anthropicKey: brand.anthropicKey, maxTokens: 16000 })

  await updateJobStatus(jobId, 'running', undefined, appUrl)

  // Thai law keyword list — topics matching any of these skip LLM guard
  const LAW_KEYWORDS = [
    'กฎหมาย', 'ภาษี', 'สัญญา', 'มรดก', 'อาญา', 'แพ่ง', 'พาณิชย์', 'แรงงาน',
    'อสังหา', 'ทรัพย์สิน', 'ลิขสิทธิ์', 'ธุรกิจ', 'บริษัท', 'หุ้นส่วน', 'ศาล',
    'คดี', 'ฟ้อง', 'สิทธิ', 'ความผิด', 'โทษ', 'พินัยกรรม', 'ค้ำประกัน',
    'จำนอง', 'เช่า', 'ซื้อขาย', 'ประกัน', 'ละเมิด', 'ทายาท',
  ]

  try {
    // ── Step 1: Resolve topic ─────────────────────────────────────────────
    // Fetch URL early so it can inform topic generation if needed
    let urlContent = ''
    const sourceUrl = String(requirement.source_url ?? '')
    if (sourceUrl.startsWith('http')) {
      urlContent = await fetchUrlContent(sourceUrl)
      console.log(`[hermes] URL fetched (manual): ${sourceUrl.slice(0, 60)}… (${urlContent.length} chars)`)
    }

    // ── Step 1.5: Category URL fallback ──────────────────────────────────
    // ถ้าไม่มี source_url → ดึง URL จาก knowledge_sources ที่ทนาย tag law_category ไว้
    if (!urlContent) {
      const briefStr = String(requirement.brief ?? '')
      const reqCategory = briefStr.match(/หมวดหมู่กฎหมาย: (.+)/)?.[1]?.split(',')[0]?.trim() ?? ''
      if (reqCategory) {
        try {
          const sb = getSupabase()
          const { data: catSources } = await (sb as any)
            .from('knowledge_sources')
            .select('source_url, name')
            .eq('law_category', reqCategory)
            .eq('status', 'indexed')
            .limit(3) as { data: Array<{ source_url: string | null; name: string }> | null }

          if (catSources && catSources.length > 0) {
            console.log(`[hermes] Category fallback URLs for "${reqCategory}": ${catSources.length} source(s)`)
            const fetched = await Promise.all(
              catSources.map(async (s) => {
                if (!s.source_url) return ''
                const content = await fetchUrlContent(s.source_url).catch(() => '')
                return content ? `=== ${s.name} ===\n${content}` : ''
              })
            )
            urlContent = fetched.filter(Boolean).join('\n\n').slice(0, 12000)
            console.log(`[hermes] Category URL content: ${urlContent.length} chars`)
          }
        } catch (err) {
          console.warn('[hermes] Category URL fallback failed:', err)
        }
      }
    }

    if (!requirement.topic) {
      const categoryLine = String(requirement.brief ?? '').match(/หมวดหมู่กฎหมาย: (.+)/)?.[1]?.trim() ?? ''
      const briefText = String(requirement.brief ?? '').slice(0, 300)
      if (!categoryLine && !urlContent) {
        await updateJobStatus(jobId, 'failed', 'Missing topic — กรุณาใส่ Topic หรือเลือกหมวดหมู่กฎหมาย', appUrl)
        await updateReqStatus(reqId, 'failed', appUrl)
        return
      }
      await updateReqStatus(reqId, 'rag_searching', appUrl)

      // Try RAG first
      const autoRes = await fetch(`${appUrl}/api/local/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: categoryLine || briefText, limit: 10 }),
      }).catch(() => null)
      const autoNotes: Array<{ title: string; score: number }> = autoRes?.ok ? await autoRes.json() : []

      if (autoNotes.length > 0) {
        // RAG hit → use the most relevant note title
        requirement.topic = autoNotes[0].title
        console.log(`[hermes] Topic resolved (RAG): "${requirement.topic}"`)
      } else {
        // RAG empty → LLM generates a specific topic from category + URL context
        const topicRaw = await llm(
          `คุณเป็น content strategist ผู้เชี่ยวชาญกฎหมายไทยและการบัญชี
สร้างหัวข้อ Facebook post ที่ดึงดูด เฉพาะเจาะจง และมีประโยชน์สำหรับกลุ่มเป้าหมาย SME / เจ้าของธุรกิจ
ตอบ JSON: { "topic": "หัวข้อภาษาไทย 10-20 คำ ที่ specific ไม่ generic" }`,
          [categoryLine && `หมวดหมู่: ${categoryLine}`, briefText && `Brief: ${briefText}`, urlContent && `เนื้อหาจาก URL:\n${urlContent.slice(0, 2000)}`]
            .filter(Boolean).join('\n\n')
        ).catch(() => null)

        let generatedTopic = categoryLine || 'กฎหมายธุรกิจ'
        try {
          if (topicRaw) {
            const parsed = JSON.parse(topicRaw)
            if (parsed.topic) generatedTopic = parsed.topic
          }
        } catch { /* keep fallback */ }
        requirement.topic = generatedTopic
        console.log(`[hermes] Topic resolved (LLM): "${requirement.topic}"`)
      }

      await fetch(`${appUrl}/api/local/requirements/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: requirement.topic }),
      }).catch(() => null)
    }

    // ── Step 2: Topic guard + layout advisor ──────────────────────────────
    // If topic clearly contains Thai law keywords → skip LLM guard entirely (saves API call)
    // Otherwise → ask LLM to validate + suggest layout
    const topic = String(requirement.topic)
    const isLawTopic = LAW_KEYWORDS.some(kw => topic.includes(kw))

    let guardResult: { ok: boolean; reason?: string; suggested_layout?: string; layout_reason?: string } = {
      ok: true,
      suggested_layout: DEFAULT_LAYOUT,
    }

    if (isLawTopic) {
      console.log(`[hermes] Guard: keyword match → pass "${topic}"`)
    } else {
      const guardRaw = await llm(
        `คุณเป็น layout advisor สำหรับ AI Content ของสำนักงานกฎหมาย
ตรวจสอบว่า topic เกี่ยวกับ (1) กฎหมายไทย หรือ (2) legal content — ชื่อหมวดหมู่กฎหมายก็ถือว่า ok
พร้อม suggest layout ที่เหมาะสม

Layout ที่มี:
- feed_square (1:1) — tips, checklist, numbered list ทั่วไป
- feed_vertical (4:5) — article, long content, บทความยาว
- feed_link (1.9:1) — แชร์ link, banner แนวนอน
- story (9:16) — story, reels
- album_cover (2:3) — album post แรก

ตอบ JSON เท่านั้น:
{ "ok": true, "reason": "...", "suggested_layout": "feed_square", "layout_reason": "เหตุผลสั้น" }`,
        `Topic: ${topic}
Brief: ${String(requirement.brief ?? '').slice(0, 300)}
${urlContent ? `\nURL Content (ย่อ):\n${urlContent.slice(0, 800)}` : ''}`
      ).catch(() => '{"ok":true,"reason":"guard_error","suggested_layout":"feed_square","layout_reason":"default"}')
      try { guardResult = JSON.parse(guardRaw) } catch { /* keep default ok:true */ }
    }

    if (!guardResult.ok) {
      await updateJobStatus(jobId, 'failed', `off_topic: ${guardResult.reason ?? 'ไม่เกี่ยวกับกฎหมาย'}`, appUrl)
      await updateReqStatus(reqId, 'failed', appUrl)
      console.log(`[hermes] 🚫 Rejected: "${topic}" — ${guardResult.reason}`)
      return
    }

    const suggestedLayoutKey = LAYOUT_SPEC[String(requirement.layout_requirement ?? '')]
      ? String(requirement.layout_requirement)
      : (guardResult.suggested_layout ?? DEFAULT_LAYOUT)
    const layoutSpec = LAYOUT_SPEC[suggestedLayoutKey] ?? LAYOUT_SPEC[DEFAULT_LAYOUT]
    console.log(`[hermes] Layout: ${suggestedLayoutKey} — ${guardResult.layout_reason ?? ''}`)

    // ── Step 3: RAG Search ────────────────────────────────────────────────
    await updateReqStatus(reqId, 'rag_searching', appUrl)
    const ragRes = await fetch(`${appUrl}/api/local/rag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: requirement.topic, limit: 5 }),
    }).catch(() => null)

    let sources: Array<{ path: string; title: string; content: string; score: number }> = []
    if (ragRes?.ok) {
      sources = await ragRes.json()
    }

    const ragContext = sources.map(s => s.content).join('\n\n---\n\n')
    const combinedContext = [
      ragContext,
      urlContent ? `\n\n=== เนื้อหาจาก URL อ้างอิง ===\n${urlContent}` : '',
    ].join('').trim()
    if (sources.length === 0) {
      console.log(`[hermes] RAG: ไม่พบข้อมูลใน vault — generate โดยไม่มี RAG context`)
    }

    // ── Step 4: Generate Content ──────────────────────────────────────────
    await updateReqStatus(reqId, 'content_generating', appUrl)
    // Topic has already passed the guard above — content LLM must generate, not reject
    const contentSystemPrompt = brand.systemPrompt ||
      `คุณเป็น content writer ประจำ${brand.firmName} ผู้เชี่ยวชาญกฎหมายไทย
หน้าที่: เขียน Facebook post เกี่ยวกับกฎหมายไทย อ้างอิงจาก RAG Sources ที่ให้มา (ถ้าไม่มี RAG ให้ใช้ความรู้กฎหมายทั่วไป)
ตอบกลับเป็น JSON ตามรูปแบบที่กำหนด ไม่อ้างกฎหมายแน่นอนเกินจริง`
    const contentRaw = await llmLong(contentSystemPrompt, buildContentPrompt(requirement, combinedContext, brand))
    let content: Record<string, unknown>
    try {
      content = JSON.parse(contentRaw)
    } catch {
      // LLM returned prose — wrap it as body
      console.warn('[hermes] content JSON parse failed — wrapping as body')
      content = { title: String(requirement.topic), hook: '', body: contentRaw, cta: '', hashtags: '', caption: '' }
    }

    // ── Word count verification & expansion pass (max 2 rounds) ─────────
    const targetWc = parseInt(String(requirement.brief ?? '').match(/ความยาวเนื้อหา: (\d+) คำ/)?.[1] ?? '0')
    if (targetWc > 0) {
      const minChars = targetWc * 4 // Thai: 1 คำ ≈ 4 chars
      for (let pass = 1; pass <= 2; pass++) {
        const bodyChars = String(content.body ?? '').replace(/\s/g, '').length
        if (bodyChars >= minChars) break
        console.log(`[hermes] Pass ${pass}: body ${bodyChars} chars < ${minChars} required — expanding…`)
        const still = minChars - bodyChars
        const expandRaw = await llmLong(
          contentSystemPrompt,
          `เนื้อหาด้านล่างนี้ยังสั้นเกินไป (${bodyChars} ตัวอักษร) ต้องการอีก ${still} ตัวอักษร (รวมเป้าหมาย ${minChars})
กรุณา EXPAND body โดย:
- ขยายทุก section ให้ละเอียดขึ้น
- เพิ่มตัวอย่าง กรณีศึกษา สถานการณ์จริง
- เพิ่ม step-by-step ที่ชัดเจน
- เพิ่มข้อควรระวัง / FAQ / ข้อแนะนำเพิ่มเติม

body ปัจจุบัน:
${content.body}

ตอบกลับเป็น JSON: { "body": "เนื้อหาที่ขยายแล้ว — ต้องยาวกว่าเดิมอย่างน้อย ${still} ตัวอักษร" }`
        ).catch(() => null)
        if (!expandRaw) break
        try {
          const expanded = JSON.parse(expandRaw)
          if (expanded.body && String(expanded.body).replace(/\s/g,'').length > bodyChars) {
            content.body = expanded.body
            console.log(`[hermes] Pass ${pass} done: ${String(content.body).replace(/\s/g,'').length} chars`)
          }
        } catch { break }
      }
      const finalChars = String(content.body ?? '').replace(/\s/g,'').length
      console.log(`[hermes] Final body: ${finalChars}/${minChars} chars (${Math.round(finalChars/minChars*100)}%)`)
    }

    // ── Step 5: Generate Image Prompt ────────────────────────────────────
    await updateReqStatus(reqId, 'image_prompt_generating', appUrl)
    let creativeProfile: Record<string, unknown> | null = null
    if (requirement.creative_profile_id) {
      const profileRes = await fetch(`${appUrl}/api/local/creative-profiles/${requirement.creative_profile_id}`).catch(() => null)
      if (profileRes?.ok) creativeProfile = await profileRes.json()
    }
    const refImages: string[] = creativeProfile?.reference_image_urls
      ? JSON.parse(String(creativeProfile.reference_image_urls)).filter((u: unknown) => typeof u === 'string' && u.startsWith('http'))
      : []

    const imgUserContent: MsgImageContent[] = [{ type: 'text', text: buildImagePromptPrompt(requirement, content, creativeProfile) }]
    for (const url of refImages.slice(0, 3)) {
      imgUserContent.push({ type: 'image_url', image_url: { url } })
    }
    if (refImages.length > 0) {
      imgUserContent.push({ type: 'text', text: 'รูปด้านบนคือ reference images จาก Creative Profile — วิเคราะห์ color palette, lighting, composition, photography style แล้วสะท้อนใน main_prompt และ dalle_prompt' })
    }

    const imageSystemPrompt = brand.systemPrompt
      ? `${brand.systemPrompt}\n\nคุณสร้าง image prompt สำหรับ Facebook post ของ${brand.firmName} ตอบกลับเป็น JSON`
      : `คุณสร้าง image prompt สำหรับ Facebook post ของ${brand.firmName} ตอบกลับเป็น JSON`
    const layoutInstruction = `\nFacebook Image Spec: layout=${layoutSpec.key}, ขนาด=${layoutSpec.size}, ratio=${layoutSpec.ratio}, ${layoutSpec.safe_zone}, brand primary=${brand.primaryColor}, secondary=${brand.secondaryColor}`
    const imageSystemPromptFull = imageSystemPrompt + layoutInstruction
    const imgUser = refImages.length > 0
      ? imgUserContent
      : buildImagePromptPrompt(requirement, content, creativeProfile, brand)
    const imagePromptRaw = await llm(imageSystemPromptFull, imgUser)
    let imagePrompt: Record<string, unknown>
    try {
      imagePrompt = JSON.parse(imagePromptRaw)
    } catch {
      console.warn('[hermes] imagePrompt JSON parse failed — using raw as dalle_prompt')
      imagePrompt = { dalle_prompt: imagePromptRaw.slice(0, 4000) }
    }

    // ── Step 5b: Video Brief (optional) ──────────────────────────────────
    let videoPrompt: Record<string, unknown> | undefined
    if (requirement.video_create === 1) {
      await updateReqStatus(reqId, 'video_prompt_generating', appUrl)
      const videoSystemPrompt = brand.systemPrompt
        ? `${brand.systemPrompt}\n\nคุณสร้าง video brief สำหรับ Facebook reel/short video ของ${brand.firmName} ภาษาไทย ตอบกลับเป็น JSON`
        : `คุณสร้าง video brief สำหรับ Facebook reel/short video ของ${brand.firmName} ภาษาไทย ตอบกลับเป็น JSON`
      const videoRaw = await llm(videoSystemPrompt, buildVideoPromptPrompt(requirement, content))
      try { videoPrompt = JSON.parse(videoRaw) } catch { videoPrompt = { script: videoRaw } }
    }

    // ── Step 6: Generate Image via DALL-E 3 ──────────────────────────────
    let generatedImageUrl: string | null = null
    const layout = suggestedLayoutKey
    if (layout !== 'text_only' && imagePrompt.dalle_prompt) {
      await updateReqStatus(reqId, 'image_generating', appUrl)
      try {
        generatedImageUrl = await generateImage(String(imagePrompt.dalle_prompt), openaiKey, layout)
        console.log(`[hermes] Image: ${generatedImageUrl}`)
      } catch (imgErr) {
        // Image generation failure is non-fatal — continue without image
        console.warn(`[hermes] Image generation skipped: ${imgErr instanceof Error ? imgErr.message : imgErr}`)
      }
    }

    // ── Step 7: Save Output ───────────────────────────────────────────────
    const ragSources = sources.map((s, i) => ({
      note_path: s.path ?? '',
      note_title: s.title ?? '',
      chunk_id: String(i),
      relevance_score: s.score ?? 0.5,
    }))

    await fetch(`${appUrl}/api/local/hermes/requirements/${reqId}/output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content, image_prompt: imagePrompt, video_prompt: videoPrompt,
        rag_sources: ragSources,
        generated_image_url: generatedImageUrl,
        suggested_layout: suggestedLayoutKey,
        layout_spec: layoutSpec,
      }),
    })

    await (sb as any)
      .from('content_outputs')
      .update({ suggested_layout: suggestedLayoutKey, layout_spec: layoutSpec })
      .eq('requirement_id', reqId)

    await updateJobStatus(jobId, 'done', undefined, appUrl)
    console.log(`[hermes] ✅ Done: ${reqId}`)

    // Step 7: Auto-schedule if facebook_account_id is set
    if (requirement.facebook_account_id) {
      await autoSchedule(reqId, String(requirement.facebook_account_id), appUrl)
      console.log(`[hermes] Auto-scheduled: ${reqId}`)
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await updateJobStatus(jobId, 'failed', msg, appUrl)
    await updateReqStatus(reqId, 'failed', appUrl)
    console.error(`[hermes] ❌ Failed: ${reqId}`, msg)
  }
}

/* ─── Layout → canvas size mapping ─────────────────────── */

const LAYOUT_CANVAS: Record<string, string> = {
  square_1x1: '1080x1080, aspect ratio 1:1',
  portrait_4x5: '1080x1350, aspect ratio 4:5',
  landscape_16x9: '1200x675, aspect ratio 16:9',
  story_9x16: '1080x1920, aspect ratio 9:16',
  vertical_4x3: '1080x810, aspect ratio 4:3',
  text_only: 'text-only, no image needed',
}

const LAYOUT_MIDJOURNEY_AR: Record<string, string> = {
  square_1x1: '--ar 1:1',
  portrait_4x5: '--ar 4:5',
  landscape_16x9: '--ar 16:9',
  story_9x16: '--ar 9:16',
  vertical_4x3: '--ar 4:3',
  text_only: '--ar 1:1',
}

/* ─── Law category → visual context ────────────────────── */

const LAW_VISUAL_CONTEXT: Record<string, string> = {
  corporate: 'modern Thai corporate office, business registration documents, professional suits, clean workspace',
  tax: 'tax forms, calculator, financial ledgers, accountant desk, organized paperwork, numbers and charts',
  property: 'Thai real estate, property documents, land title deed, modern condominium, house keys',
  labor: 'workplace, employees, employment contract signing, professional Thai office environment',
  contract: 'legal contract documents, signing ceremony, handshake, formal agreement papers',
  criminal: 'Thai courthouse exterior, gavel, scales of justice, legal books, serious formal setting',
  family: 'family silhouette, inheritance documents, will and testament, family law office',
  ip: 'intellectual property, copyright symbol, creative work, patent documents, innovation',
  litigation: 'courtroom, legal files stacked, lawyer briefcase, formal Thai legal setting',
  finance: 'stock charts, financial documents, Thai baht currency, securities trading, banking',
  immigration: 'passport, visa documents, Thai flag, government office, international travel',
  environment: 'environmental permit documents, green space, urban planning map, construction site',
}

/* ─── Category → relevant Thai laws ────────────────────── */

const LAW_REFERENCES: Record<string, string[]> = {
  corporate: [
    'ป.พ.พ. มาตรา 1096–1171 — การจัดตั้ง จดทะเบียน และโครงสร้างบริษัทจำกัด',
    'ป.พ.พ. มาตรา 1172–1199 — หน้าที่กรรมการ ความรับผิดส่วนตัว',
    'พ.ร.บ. บริษัทมหาชนจำกัด พ.ศ. 2535 มาตรา 85 — กรรมการผิดหน้าที่ โทษปรับ 500,000 บาท',
    'พ.ร.บ. ทะเบียนพาณิชย์ พ.ศ. 2499 — ไม่จดทะเบียน โทษปรับไม่เกิน 2,000 บาท/วัน',
    'ประมวลรัษฎากร มาตรา 65 — ภาษีเงินได้นิติบุคคล อัตรา 20% ของกำไรสุทธิ',
  ],
  tax: [
    'ประมวลรัษฎากร มาตรา 37 — เจตนาหลีกเลี่ยงภาษี โทษจำคุกไม่เกิน 7 ปี และปรับไม่เกิน 200,000 บาท',
    'ประมวลรัษฎากร มาตรา 37 ทวิ — แจ้งข้อมูลเท็จในแบบภาษี โทษจำคุกไม่เกิน 1 ปี หรือปรับไม่เกิน 200,000 บาท หรือทั้งจำทั้งปรับ',
    'ประมวลรัษฎากร มาตรา 26 — เบี้ยปรับ 100% ของภาษีที่ต้องเสีย (กรณียื่นเพิ่มเติม) หรือ 200% (กรณีถูกประเมิน)',
    'ประมวลรัษฎากร มาตรา 27 — เงินเพิ่ม 1.5% ต่อเดือนของภาษีที่ค้างชำระ (ไม่เกินจำนวนภาษี)',
    'ประมวลรัษฎากร มาตรา 65 ตรี — รายจ่ายต้องห้าม ไม่สามารถนำมาหักภาษีได้',
    'ป.อ. มาตรา 264–268 — ปลอมแปลงใบเสร็จ/เอกสารทางบัญชี โทษจำคุก 3–5 ปี',
    'พ.ร.บ. ป้องกันและปราบปรามการฟอกเงิน พ.ศ. 2542 — เงินจากการเลี่ยงภาษีถือเป็นทรัพย์สินที่เกี่ยวกับการกระทำความผิด',
  ],
  property: [
    'ประมวลกฎหมายที่ดิน พ.ศ. 2497 มาตรา 58 — การโอนที่ดินต้องทำต่อพนักงานเจ้าหน้าที่ ฝ่าฝืนโมฆะ',
    'ป.พ.พ. มาตรา 456 — สัญญาซื้อขายอสังหาริมทรัพย์ต้องทำเป็นหนังสือและจดทะเบียน มิฉะนั้นเป็นโมฆะ',
    'ป.พ.พ. มาตรา 537–603 — สัญญาเช่า สิทธิเช่าเกิน 3 ปีต้องจดทะเบียน',
    'พ.ร.บ. อาคารชุด พ.ศ. 2522 มาตรา 19 — ชาวต่างชาติถือครองได้ไม่เกิน 49% ของพื้นที่ทั้งหมด',
    'พ.ร.บ. การจัดสรรที่ดิน พ.ศ. 2543 — โครงการจัดสรรต้องขออนุญาตก่อน ฝ่าฝืนโทษจำคุกไม่เกิน 2 ปี ปรับไม่เกิน 400,000 บาท',
    'ประมวลรัษฎากร — ภาษีธุรกิจเฉพาะ 3.3% และอากรแสตมป์ 0.5% จากการโอนอสังหาริมทรัพย์',
  ],
  labor: [
    'พ.ร.บ. คุ้มครองแรงงาน พ.ศ. 2541 มาตรา 118 — ค่าชดเชยเลิกจ้าง 30 วัน–400 วัน ตามอายุงาน',
    'พ.ร.บ. คุ้มครองแรงงาน มาตรา 17 — บอกเลิกสัญญาต้องบอกล่วงหน้าไม่น้อยกว่า 1 รอบจ่ายค่าจ้าง',
    'พ.ร.บ. คุ้มครองแรงงาน มาตรา 119 — ไล่ออกไม่ต้องจ่ายชดเชย กรณีลูกจ้างทุจริต ละทิ้งหน้าที่ ฯลฯ',
    'พ.ร.บ. คุ้มครองแรงงาน มาตรา 144 — นายจ้างฝ่าฝืนโทษจำคุกไม่เกิน 6 เดือน หรือปรับไม่เกิน 100,000 บาท หรือทั้งจำทั้งปรับ',
    'พ.ร.บ. ประกันสังคม พ.ศ. 2533 — นำส่งสมทบ 5% ของค่าจ้าง ไม่นำส่งปรับ 2% ต่อเดือน',
    'ค่าจ้างขั้นต่ำตาม ประกาศคณะกรรมการค่าจ้าง — ฝ่าฝืนโทษจำคุกไม่เกิน 6 เดือน ปรับไม่เกิน 100,000 บาท',
  ],
  contract: [
    'ป.พ.พ. มาตรา 150 — นิติกรรมมีวัตถุประสงค์ต้องห้ามตามกฎหมาย เป็นโมฆะ',
    'ป.พ.พ. มาตรา 213–217 — บังคับชำระหนี้ตามสัญญา ค่าเสียหาย ดอกเบี้ยผิดนัด 5–7.5% ต่อปี',
    'ป.พ.พ. มาตรา 369 — สัญญาต่างตอบแทน ฝ่ายหนึ่งบิดพลิ้ว อีกฝ่ายระงับชำระได้',
    'ป.พ.พ. มาตรา 420 — ละเมิด ต้องชดใช้ค่าสินไหมทดแทน',
    'พ.ร.บ. ว่าด้วยข้อสัญญาที่ไม่เป็นธรรม พ.ศ. 2540 — ศาลสั่งแก้ไขหรือไม่บังคับข้อสัญญาที่เอาเปรียบได้',
    'พ.ร.บ. คุ้มครองผู้บริโภค พ.ศ. 2522 มาตรา 56 — ผู้ประกอบธุรกิจโกงผู้บริโภค โทษจำคุกไม่เกิน 1 ปี ปรับไม่เกิน 100,000 บาท',
  ],
  criminal: [
    'ป.อ. มาตรา 341 — ฉ้อโกง โทษจำคุกไม่เกิน 3 ปี หรือปรับไม่เกิน 60,000 บาท หรือทั้งจำทั้งปรับ',
    'ป.อ. มาตรา 343 — ฉ้อโกงประชาชน โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 100,000 บาท',
    'ป.อ. มาตรา 352 — ยักยอกทรัพย์ โทษจำคุกไม่เกิน 3 ปี ปรับไม่เกิน 60,000 บาท',
    'ป.อ. มาตรา 264 — ปลอมแปลงเอกสาร โทษจำคุกไม่เกิน 3 ปี ปรับไม่เกิน 60,000 บาท',
    'ป.อ. มาตรา 268 — ใช้เอกสารปลอม โทษเท่ากับความผิดฐานปลอม',
    'พ.ร.บ. คอมพิวเตอร์ พ.ศ. 2560 มาตรา 14 — นำเข้าข้อมูลเท็จ โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 100,000 บาท',
    'พ.ร.บ. ป้องกันและปราบปรามการฟอกเงิน พ.ศ. 2542 — โทษจำคุก 1–10 ปี ปรับ 20,000–200,000 บาท',
  ],
  family: [
    'ป.พ.พ. มาตรา 1452 — ชายหรือหญิงจะทำการสมรสในขณะที่ตนมีคู่สมรสอยู่ไม่ได้ ฝ่าฝืนโมฆะ',
    'ป.พ.พ. มาตรา 1501 — สิทธิเรียกค่าทดแทนจากชู้ หรือผู้ร่วมประเวณี',
    'ป.พ.พ. มาตรา 1526 — ค่าอุปการะเลี้ยงดูบุตร ศาลกำหนดตามความสามารถของผู้จ่าย',
    'ป.พ.พ. มาตรา 1599 — มรดกตกทอดแก่ทายาทโดยธรรมหรือผู้รับพินัยกรรม',
    'ป.พ.พ. มาตรา 1629 — ทายาทโดยธรรม 6 ลำดับ บุตร บิดามารดา พี่น้อง ปู่ย่าตายาย ลุงป้าน้าอา',
    'พ.ร.บ. ภาษีการรับมรดก พ.ศ. 2558 — มรดกเกิน 100 ล้านบาท เสียภาษี 5–10%',
  ],
  ip: [
    'พ.ร.บ. ลิขสิทธิ์ พ.ศ. 2537 มาตรา 69 — ละเมิดลิขสิทธิ์ โทษจำคุก 6 เดือน–4 ปี ปรับ 100,000–800,000 บาท',
    'พ.ร.บ. เครื่องหมายการค้า พ.ศ. 2534 มาตรา 108 — ปลอมเครื่องหมายการค้า โทษจำคุกไม่เกิน 4 ปี ปรับไม่เกิน 400,000 บาท',
    'พ.ร.บ. สิทธิบัตร พ.ศ. 2522 มาตรา 85 — ละเมิดสิทธิบัตร โทษจำคุกไม่เกิน 2 ปี ปรับไม่เกิน 400,000 บาท',
    'พ.ร.บ. ความลับทางการค้า พ.ศ. 2545 มาตรา 33 — เปิดเผยความลับทางการค้า โทษจำคุกไม่เกิน 2 ปี ปรับไม่เกิน 200,000 บาท',
  ],
  litigation: [
    'ป.วิ.แพ่ง มาตรา 172 — ฟ้องคดีแพ่ง ต้องบรรยายฟ้องชัดเจน ครบถ้วน',
    'ป.วิ.แพ่ง มาตรา 193/30 — อายุความทั่วไป 10 ปี นับจากวันที่อาจบังคับสิทธิได้',
    'ป.วิ.อาญา มาตรา 2 — สิทธิผู้เสียหายแจ้งความ ร้องทุกข์ภายในอายุความ',
    'ป.อ. มาตรา 95 — อายุความคดีอาญา ขึ้นอยู่กับอัตราโทษ (1–20 ปี)',
    'พ.ร.บ. อนุญาโตตุลาการ พ.ศ. 2545 — ระงับข้อพิพาทนอกศาล คำชี้ขาดผูกพันคู่กรณี',
    'พ.ร.บ. ไกล่เกลี่ยข้อพิพาท พ.ศ. 2562 — ไกล่เกลี่ยก่อนฟ้อง ประหยัดเวลาและค่าใช้จ่าย',
  ],
  finance: [
    'พ.ร.บ. หลักทรัพย์และตลาดหลักทรัพย์ พ.ศ. 2535 มาตรา 240 — Insider Trading โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 500,000 บาท',
    'ป.อ. มาตรา 341 — ฉ้อโกง โทษจำคุกไม่เกิน 3 ปี ปรับไม่เกิน 60,000 บาท',
    'ป.อ. มาตรา 343 — ฉ้อโกงประชาชน (แชร์ลูกโซ่ เงินกู้นอกระบบ) โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 100,000 บาท',
    'พ.ร.บ. ขายตรงและตลาดแบบตรง พ.ศ. 2545 มาตรา 54 — แชร์ลูกโซ่ โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 500,000 บาท',
    'พ.ร.บ. ป้องกันและปราบปรามการฟอกเงิน พ.ศ. 2542 — โทษจำคุก 1–10 ปี ปรับ 20,000–200,000 บาท',
    'พ.ร.บ. คอมพิวเตอร์ พ.ศ. 2560 มาตรา 14 — หลอกลวงออนไลน์ โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 100,000 บาท',
  ],
  immigration: [
    'พ.ร.บ. คนเข้าเมือง พ.ศ. 2522 มาตรา 81 — อยู่เกินกำหนด (Overstay) โทษจำคุกไม่เกิน 2 ปี ปรับไม่เกิน 20,000 บาท หรือทั้งจำทั้งปรับ',
    'พ.ร.บ. คนเข้าเมือง มาตรา 11 — เข้าเมืองโดยไม่มี Visa หรือผิดประเภท ถูกส่งกลับและแบนห้ามเข้า',
    'พ.ร.บ. แรงงานต่างด้าว พ.ศ. 2560 มาตรา 8 — ทำงานโดยไม่มีใบอนุญาต โทษจำคุกไม่เกิน 5 ปี ปรับไม่เกิน 100,000 บาท',
    'พ.ร.บ. แรงงานต่างด้าว มาตรา 27 — นายจ้างจ้างแรงงานผิดกฎหมาย โทษปรับ 10,000–100,000 บาท/คน',
  ],
  environment: [
    'พ.ร.บ. ส่งเสริมและรักษาคุณภาพสิ่งแวดล้อม พ.ศ. 2535 มาตรา 97 — ปล่อยมลพิษเกินมาตรฐาน โทษจำคุกไม่เกิน 1 ปี ปรับไม่เกิน 100,000 บาท',
    'พ.ร.บ. โรงงาน พ.ศ. 2535 มาตรา 45 — ฝ่าฝืนเงื่อนไขใบอนุญาต โทษจำคุกไม่เกิน 2 ปี ปรับไม่เกิน 200,000 บาท',
    'พ.ร.บ. ควบคุมอาคาร พ.ศ. 2522 มาตรา 65 — ก่อสร้างโดยไม่ได้รับอนุญาต โทษจำคุกไม่เกิน 3 เดือน ปรับไม่เกิน 60,000 บาท',
    'พ.ร.บ. ผังเมือง พ.ศ. 2562 มาตรา 79 — ใช้ที่ดินผิดประเภทตามผังเมือง โทษปรับไม่เกิน 100,000 บาท และปรับรายวันไม่เกิน 5,000 บาท/วัน',
  ],
}

/* ─── Tone → visual mood ────────────────────────────────── */

const TONE_VISUAL_MOOD: Record<string, string> = {
  professional: 'clean minimalist, cool blue-white palette, sharp focus, corporate lighting',
  friendly: 'warm soft lighting, approachable composition, slightly desaturated warm tones',
  educational: 'infographic-style clarity, clean backgrounds, instructional visual hierarchy',
  authoritative: 'dramatic lighting, strong contrast, dark navy and gold accents, commanding composition',
  conversational: 'candid natural lighting, relaxed composition, lifestyle photography feel',
  urgent: 'high contrast, bold red-orange accents, dynamic angle, immediate visual impact',
  storytelling: 'cinematic framing, narrative depth, environmental storytelling, warm golden hour',
  inspirational: 'aspirational composition, upward perspective, bright hopeful lighting',
  empowering: 'strong confident subject, empowering pose, vibrant accent colors',
  alert: 'warning visual cues, high contrast yellow-red, attention-grabbing composition',
}

/* ─── Prompt builders ───────────────────────────────────── */

function buildContentPrompt(req: Record<string, unknown>, ragContext: string, brand?: BrandContext) {
  const brief = String(req.brief ?? '')

  const lawCategoryLine = brief.match(/หมวดหมู่กฎหมาย: (.+)/)?.[1] ?? ''
  const goalsLine = brief.match(/เป้าหมาย: (.+)/)?.[1] ?? ''
  const keyMessageLine = brief.match(/Key message: (.+)/)?.[1] ?? ''
  const ctaLine = brief.match(/CTA: (.+)/)?.[1] ?? ''
  const doNotLine = brief.match(/Do NOT mention: (.+)/)?.[1] ?? ''
  const wordCountMatch = brief.match(/ความยาวเนื้อหา: (\d+) คำ/)
  const targetWordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : null
  const blueprintMatch = brief.match(/Content Blueprint:\n([\s\S]+?)(?:\n\n|$)/)
  const blueprintText = blueprintMatch?.[1] ?? ''
  const referencesMatch = brief.match(/References:\n([\s\S]+?)(?:\n\n|$)/)
  const referencesText = referencesMatch?.[1] ?? ''

  // Content Intent fields (กรอกโดยทนาย)
  const angleText = brief.match(/มุมมองการเล่าเรื่อง: (.+)/)?.[1] ?? ''
  const formatStyleText = brief.match(/รูปแบบเนื้อหา: (.+)/)?.[1] ?? ''
  const sourceTypeText = brief.match(/ที่มาของเนื้อหา: (.+)/)?.[1] ?? ''
  const depthLevelText = brief.match(/ระดับความซับซ้อน: (.+)/)?.[1] ?? ''
  const timelinessText = brief.match(/ความทันสมัย: (.+)/)?.[1] ?? ''

  // Gap 3: warn when timeliness = new law but no source URL
  const timelinessWarning = timelinessText && timelinessText.includes('ใหม่') && !String(req.source_url ?? '').startsWith('http')
    ? `\n⚠️ ทนายเลือก "${timelinessText}" แต่ไม่มี Source URL — ห้ามอ้างกฎหมายที่แก้ไขล่าสุดโดยไม่มีที่มา ให้ระบุว่า "กรุณาตรวจสอบฉบับปัจจุบัน" แทน`
    : ''

  const intentBlock = [angleText, formatStyleText, sourceTypeText, depthLevelText, timelinessText].some(Boolean)
    ? `
═══ เจตนาของเนื้อหา (กรอกโดยทนาย) ═══
${angleText ? `มุมมอง: ${angleText}` : ''}
${formatStyleText ? `รูปแบบ: ${formatStyleText} — ใช้ format นี้ในการเขียน body` : ''}
${sourceTypeText ? `ที่มา: ${sourceTypeText}` : ''}
${depthLevelText ? `ระดับผู้อ่าน: ${depthLevelText}` : ''}
${timelinessText ? `ความทันสมัย: ${timelinessText}` : ''}${timelinessWarning}`
    : ''

  // Map selected categories → inject relevant Thai law references
  const categoryMap: Record<string, string> = {
    'กฎหมายบริษัท': 'corporate', 'ภาษีและบัญชี': 'tax', 'อสังหาริมทรัพย์': 'property',
    'แรงงาน': 'labor', 'สัญญา': 'contract', 'อาญา': 'criminal',
    'ครอบครัว/มรดก': 'family', 'ทรัพย์สินทางปัญญา': 'ip', 'คดีความ/ฟ้องร้อง': 'litigation',
    'การเงิน/หลักทรัพย์': 'finance', 'วีซ่า/คนเข้าเมือง': 'immigration', 'สิ่งแวดล้อม/ผังเมือง': 'environment',
  }
  const selectedCategories = lawCategoryLine.split(',').map(s => s.trim())
  const relevantLaws: string[] = []
  for (const cat of selectedCategories) {
    const key = categoryMap[cat]
    if (key && LAW_REFERENCES[key]) relevantLaws.push(...LAW_REFERENCES[key])
  }
  // Topic-based law detection (ไม่เลือก category แต่ topic ชัดเจน)
  const topic = String(req.topic ?? '')
  const topicLower = topic.toLowerCase()
  if (!relevantLaws.length) {
    if (topicLower.includes('หลอกลวง') || topicLower.includes('ฉ้อโกง') || topicLower.includes('ฟอก') || topicLower.includes('บัญชีม้า')) {
      relevantLaws.push(...LAW_REFERENCES.criminal, ...LAW_REFERENCES.finance)
    } else if (topicLower.includes('คดีแพ่ง') || topicLower.includes('ฟ้องร้อง') || topicLower.includes('กรณีศึกษา')) {
      relevantLaws.push(...LAW_REFERENCES.litigation, ...LAW_REFERENCES.contract)
    } else if (topicLower.includes('แรงงาน') || topicLower.includes('ลูกจ้าง') || topicLower.includes('นายจ้าง')) {
      relevantLaws.push(...LAW_REFERENCES.labor)
    } else if (topicLower.includes('ภาษี') || topicLower.includes('สรรพากร')) {
      relevantLaws.push(...LAW_REFERENCES.tax)
    }
  }
  const lawBlock = relevantLaws.length > 0
    ? `\n═══ กฎหมายที่เกี่ยวข้อง (ต้องอ้างอิงในเนื้อหา) ═══\n${relevantLaws.map(l => `• ${l}`).join('\n')}`
    : ''

  // ─── Case Study detection ──────────────────────────────────────────────
  const isCaseStudy = topicLower.includes('กรณีศึกษา') || goalsLine.includes('case_study') || goalsLine.includes('Case Study')
  const hasSourceUrl = String(req.source_url ?? '').startsWith('http')

  const isCarousel = req.content_type === 'carousel'
  const isReel = req.content_type === 'reel_script' || req.content_type === 'short_video'

  let formatInstructions = ''
  if (isCaseStudy) {
    // Case Study format — structured 5-part นาทีการเปิดเผยข้อมูลลูกค้า
    formatInstructions = hasSourceUrl
      ? `
═══ FORMAT: CASE STUDY (อ้างอิงจาก Source URL ที่ให้) ═══
เขียน body ตาม 5-part structure นี้ (ใส่หัวข้อแต่ละส่วนด้วย emoji):

⚖️ เหตุการณ์ (Facts): ข้อเท็จจริงของคดี — ใคร ทำอะไร เมื่อไหร่ ความเสียหายเท่าไหร่
📋 ประเด็นกฎหมาย (Legal Issue): กฎหมาย/มาตราที่เกี่ยวข้อง — อ้างอิงจาก LAW_REFERENCES ด้านบน
🎯 กลยุทธ์ (Strategy): ทีมกฎหมายวางแผนอะไร ทำขั้นตอนไหนบ้าง
✅ ผลลัพธ์ (Outcome): ผลคดีคืออะไร ได้รับเท่าไหร่ ใช้เวลากี่เดือน
💡 บทเรียน (Lesson): สิ่งที่ผู้อ่านควรทำหากเจอสถานการณ์คล้ายกัน

body ต้องมีรายละเอียดครบ 5 ส่วน ไม่ย่อ`
      : `
═══ FORMAT: สมมติกรณีศึกษา (Hypothetical Case Study) ═══
⚠️ ไม่มี Source URL — ให้สร้างเป็นสถานการณ์สมมติที่สมจริงและให้ความรู้ที่ถูกต้อง
body ต้องเริ่มด้วย "📌 สถานการณ์สมมติ (เพื่อการศึกษา)" และมีโครงสร้างดังนี้:

📌 สถานการณ์สมมติ: ตัวละครสมมติ สถานการณ์ที่เกิดขึ้น ความเสียหาย
⚖️ กฎหมายที่เกี่ยวข้อง: มาตรา/พ.ร.บ. ที่ apply กับสถานการณ์นี้ (อ้างจาก LAW_REFERENCES)
🎯 แนวทางที่ถูกต้อง: ควรทำอะไร ลำดับขั้นตอน
✅ ผลที่ควรได้รับ: สิทธิ์ที่มีตามกฎหมาย
💡 สรุปบทเรียน: takeaway สำหรับผู้อ่าน

disclaimer ใน JSON ต้องระบุชัดว่า "เป็นกรณีศึกษาสมมติเพื่อการศึกษา ไม่ใช่คดีจริง"`
  } else if (isCarousel) {
    formatInstructions = `
Content Type: Carousel — สร้าง body เป็น slides (4-7 slides) แต่ละ slide มี headline + 1-2 บรรทัด
"body": "Slide 1: [headline] — [text]\nSlide 2: ..."`
  } else if (isReel) {
    formatInstructions = `
Content Type: Reel/Short Video — สร้าง body เป็น script สั้น เน้น hook แรก 3 วินาที`
  } else if (formatStyleText) {
    // Gap 1: map lawyer-selected format_style → explicit formatInstructions
    const fsl = formatStyleText.toLowerCase()
    if (fsl.includes('listicle') || fsl.includes('รายการ')) {
      formatInstructions = `
FORMAT: Listicle — เขียน body เป็นข้อ 5-7 ข้อ แต่ละข้อขึ้นต้นด้วย emoji + bold หัวข้อย่อย + อธิบาย 2-3 บรรทัด
อ้างอิงกฎหมายอย่างน้อย 1 มาตราในแต่ละข้อที่เกี่ยวข้อง`
    } else if (fsl.includes('step') || fsl.includes('ขั้นตอน')) {
      formatInstructions = `
FORMAT: Step-by-Step — เขียน body เป็น numbered steps (ขั้นตอนที่ 1, 2, 3...) แต่ละขั้นตอนอธิบายชัดเจน action ที่ต้องทำ
ระบุกฎหมาย/มาตราที่ cover แต่ละขั้นตอนด้วย`
    } else if (fsl.includes('q&a') || fsl.includes('ถาม') || fsl.includes('faq')) {
      formatInstructions = `
FORMAT: Q&A — เขียน body เป็นคู่ ❓คำถาม / ✅ คำตอบ อย่างน้อย 3-5 คู่
คำถามต้องเป็นสิ่งที่คนทั่วไปสงสัยจริง คำตอบต้องอ้างอิงกฎหมายที่ถูกต้อง`
    } else if (fsl.includes('story') || fsl.includes('เล่าเรื่อง')) {
      formatInstructions = `
FORMAT: Storytelling — เขียน body เป็นเรื่องเล่าที่มีตัวละคร สถานการณ์ ปัญหา และการแก้ไข
ใส่กฎหมายอ้างอิงในจังหวะที่เกี่ยวข้องกับเรื่อง ไม่ยัดเยียด`
    }
  }

  const brandBlock = brand ? `
═══ BRAND IDENTITY ═══
สำนักงาน: ${brand.firmName}${brand.tagline ? ` — ${brand.tagline}` : ''}
Default Tone: ${brand.tone}
Default Target Audience: ${brand.targetAudience}
${brand.websiteUrl ? `Website: ${brand.websiteUrl}` : ''}
${brand.phone ? `โทร: ${brand.phone}` : ''}
${brand.email ? `Email: ${brand.email}` : ''}
${brand.lineId ? `LINE: ${brand.lineId}` : ''}
Brand Colors: Primary ${brand.primaryColor} / Secondary ${brand.secondaryColor}
` : ''

  const wc = targetWordCount ?? 800
  const minChars = wc * 4
  const bodyStructure = isCaseStudy
    ? `body ต้องครบ 5 ส่วนตาม FORMAT ด้านล่าง (ความยาวรวมอย่างน้อย ${minChars} ตัวอักษร)`
    : `ความยาวเนื้อหา body: อย่างน้อย ${wc} คำ (≈ ${minChars} ตัวอักษร)
⚠️ กฎเหล็ก: body ต้องไม่ต่ำกว่า ${minChars} ตัวอักษร
โครงสร้าง body:
1. บทนำ (${Math.round(wc*0.15)} คำ)
2. เนื้อหาหลัก 3-5 หัวข้อย่อย พร้อมอ้างอิงกฎหมาย (${Math.round(wc*0.55)} คำ)
3. ตัวอย่าง/กรณีศึกษา (${Math.round(wc*0.15)} คำ)
4. ข้อควรระวัง (${Math.round(wc*0.1)} คำ)
5. สรุป (${Math.round(wc*0.05)} คำ)`

  // JSON schema — case study เพิ่ม disclaimer field
  // Gap 2: source_type สมมติ → เพิ่ม disclaimer แม้ไม่ใช่ case study
  const isHypothetical = sourceTypeText.includes('สมมติ') || sourceTypeText.includes('hypothetical')
  const hypotheticalDisclaimer = isHypothetical
    ? `\n  "disclaimer": "เนื้อหานี้เป็นความรู้ทั่วไปเพื่อการศึกษา ข้อมูลอาจเป็นสถานการณ์สมมติ ควรปรึกษาทนายความก่อนดำเนินการใดๆ",`
    : ''
  const jsonSchema = isCaseStudy ? `{
  "title": "ชื่อ post ที่คนจำได้",
  "hook": "ประโยคเปิด 1-2 บรรทัด ดึงดูดให้หยุดอ่าน",
  "caption": "caption สั้น 1-2 บรรทัด สรุป value ของโพส",
  "body": "เนื้อหาครบ 5 ส่วนตาม FORMAT — Facts / Legal Issue / Strategy / Outcome / Lesson พร้อมอ้างอิงกฎหมาย",
  "legal_references": ["ป.วิ.แพ่ง มาตรา XXX", "ป.พ.พ. มาตรา XXX — ชื่อ"],
  "disclaimer": "${hasSourceUrl ? 'ข้อมูลอ้างอิงจาก [source] — เพื่อการศึกษา ไม่ใช่คำแนะนำทางกฎหมาย' : 'กรณีศึกษาสมมติเพื่อการศึกษาเท่านั้น ไม่ใช่คดีจริง — หากมีข้อสงสัยควรปรึกษาทนายความ'}",
  "cta": "call to action ชัดเจน 1 ประโยค",
  "hashtags": "#กรณีศึกษากฎหมาย #คดีแพ่ง #กฎหมายไทย #ทนายความ #legalcase",
  "compliance_note": "ข้อจำกัดหรือ legal risk ของเนื้อหานี้"
}` : `{
  "title": "ชื่อ post ที่คนจำได้",
  "hook": "ประโยคเปิด 1-2 บรรทัด ดึงดูดให้หยุดอ่าน (ห้ามเริ่มด้วย 'สวัสดี' หรือชื่อบริษัท)",
  "caption": "caption สั้น 1-2 บรรทัด สรุป value ของโพส",
  "body": "เนื้อหาหลัก — ครบตามความยาวที่กำหนด พร้อมอ้างอิงกฎหมาย/มาตรา",
  "legal_references": ["ป.พ.พ. มาตรา XXX — ชื่อมาตรา", "พ.ร.บ. XXX พ.ศ. XXXX มาตรา YYY"],${hypotheticalDisclaimer}
  "cta": "call to action ชัดเจน 1 ประโยค",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5",
  "compliance_note": "ข้อควรระวัง legal risk หรือข้อจำกัดของเนื้อหานี้ (ห้ามเว้นว่าง)"
}`

  return `คุณเป็น content writer ผู้เชี่ยวชาญกฎหมายไทย เขียน Facebook post ที่ถูกต้องทางกฎหมาย เข้าใจง่าย และ engage ผู้อ่าน
กฎสำคัญ: ทุก claim ทางกฎหมายต้องอ้างอิงมาตราหรือ พ.ร.บ. ที่ถูกต้องเสมอ — ห้ามระบุโทษหรือสิทธิโดยไม่มีที่มา
${brandBlock}
═══ BRIEF ═══
Topic: ${topic}
${lawCategoryLine ? `หมวดหมู่กฎหมาย: ${lawCategoryLine}` : ''}
${goalsLine ? `เป้าหมาย: ${goalsLine}` : ''}
${keyMessageLine ? `Key Message: ${keyMessageLine}` : ''}
${ctaLine ? `CTA ที่ต้องการ: ${ctaLine}` : ''}
Target Audience: ${req.target_audience ?? 'เจ้าของธุรกิจและประชาชนทั่วไป'}
Tone: ${req.tone ?? 'professional'}
Objective: ${req.objective ?? 'ให้ความรู้'}
${bodyStructure}
${doNotLine ? `ห้ามพูดถึง: ${doNotLine}` : ''}
${intentBlock}
${lawBlock}

${blueprintText ? `═══ BLUEPRINT ═══\n${blueprintText}` : ''}
${referencesText ? `═══ REFERENCES ═══\n${referencesText}` : ''}

═══ RAG SOURCES ═══
${ragContext}
${formatInstructions}

ตอบกลับเป็น JSON เท่านั้น:
${jsonSchema}`
}

function buildImagePromptPrompt(req: Record<string, unknown>, content: Record<string, unknown>, profile: Record<string, unknown> | null = null, brand?: BrandContext) {
  const layout = String(req.layout_requirement ?? 'square_1x1')
  const canvas = LAYOUT_CANVAS[layout] ?? '1080x1080, aspect ratio 1:1'
  const mjAR = LAYOUT_MIDJOURNEY_AR[layout] ?? '--ar 1:1'

  const brief = String(req.brief ?? '')
  const lawCategoryLine = brief.match(/หมวดหมู่กฎหมาย: (.+)/)?.[1] ?? ''
  const firstCategory = lawCategoryLine.split(',')[0]?.trim().toLowerCase() ?? ''

  const categoryMap: Record<string, string> = {
    'กฎหมายบริษัท': 'corporate', 'ภาษีและบัญชี': 'tax', 'อสังหาริมทรัพย์': 'property',
    'แรงงาน': 'labor', 'สัญญา': 'contract', 'อาญา': 'criminal',
    'ครอบครัว/มรดก': 'family', 'ทรัพย์สินทางปัญญา': 'ip', 'คดีความ/ฟ้องร้อง': 'litigation',
    'การเงิน/หลักทรัพย์': 'finance', 'วีซ่า/คนเข้าเมือง': 'immigration', 'สิ่งแวดล้อม/ผังเมือง': 'environment',
  }
  const categoryKey = categoryMap[firstCategory] ?? 'corporate'
  const visualContext = LAW_VISUAL_CONTEXT[categoryKey] ?? LAW_VISUAL_CONTEXT.corporate

  const tones = String(req.tone ?? 'professional').split(',').map(t => t.trim())
  const primaryTone = tones[0] ?? 'professional'
  const visualMood = TONE_VISUAL_MOOD[primaryTone] ?? TONE_VISUAL_MOOD.professional

  // Brand baseline (used when no creative profile)
  const brandSection = brand && !profile ? `
═══ BRAND COLORS ═══
Primary: ${brand.primaryColor} / Secondary: ${brand.secondaryColor}
สำนักงาน: ${brand.firmName}
` : ''

  // Creative Profile overrides
  const profileSection = profile ? `
═══ CREATIVE PROFILE: ${profile.name} ═══
${profile.color_scheme ? `Brand Colors: ${profile.color_scheme}` : ''}
${profile.photography_style ? `Photography Style: ${profile.photography_style}` : ''}
${profile.visual_mood ? `Visual Mood: ${profile.visual_mood}` : ''}
${profile.logo_usage ? `Logo Usage: ${profile.logo_usage}` : ''}
${profile.do_not_use ? `Do NOT use: ${profile.do_not_use}` : ''}
${profile.notes ? `Additional Notes: ${profile.notes}` : ''}
⚠️ Creative Profile นี้มีความสำคัญสูงสุด — ต้อง follow ทุก guideline ข้างต้น` : ''

  const isTextOnly = layout === 'text_only'

  if (isTextOnly) {
    return `สร้าง text-overlay design brief สำหรับ Facebook post (ไม่มีภาพ — ใช้ typography/color เท่านั้น)

Topic: ${req.topic}
Content Title: ${content.title ?? ''}
Tone: ${req.tone ?? 'professional'}

ตอบกลับเป็น JSON:
{
  "main_prompt": "Typography-based design: describe background color, font style, layout arrangement for text-only post",
  "text_overlay": "ข้อความหลักที่แสดงบนโพส (2-3 บรรทัด ภาษาไทย)",
  "negative_prompt": "avoid: cluttered text, low contrast, hard-to-read fonts",
  "layout_spec": "Text-only layout description with color palette and spacing",
  "canvas_size": "${canvas}",
  "brand_style": "Color scheme and typography style for Thai law firm"
}`
  }

  return `คุณเป็น expert image prompt engineer สำหรับ AI image generation (DALL-E 3, Midjourney, Adobe Firefly)
สร้าง image prompt ที่ละเอียด copy-paste ready สำหรับ Facebook post ของสำนักงานกฎหมายไทย

═══ CONTEXT ═══
Topic: ${req.topic}
Content Title: ${String(content.title ?? '')}
Content Hook: ${String(content.hook ?? '')}
Law Category: ${lawCategoryLine || 'Corporate/General Law'}
Image Direction จากลูกค้า: ${String(req.image_direction ?? '(ไม่ระบุ)')}
Tone: ${req.tone ?? 'professional'}
Layout: ${canvas}

═══ VISUAL REFERENCES ═══
Category Visual Context: ${visualContext}
Tone Mood: ${visualMood}
${brandSection}${profileSection}

สร้าง prompt ที่:
1. main_prompt: ภาษาอังกฤษ ละเอียด copy-paste ใส่ Midjourney/DALL-E ได้เลย
   - รวม subject, environment, lighting, camera lens, style, mood
   - ลงท้ายด้วย Midjourney parameters: ${mjAR} --style raw --v 6.1
2. dalle_prompt: ปรับสำหรับ DALL-E 3 (ไม่มี -- parameters, เป็น prose)
3. text_overlay: ข้อความไทยซ้อนบนภาพ (hook หรือ title สั้นๆ max 2 บรรทัด)
4. negative_prompt: สิ่งที่ไม่ต้องการ (Midjourney --no format)
5. layout_spec: อธิบาย safe zone สำหรับข้อความ, focal point, composition
6. canvas_size: "${canvas}"
7. brand_style: โทนสีหลัก + secondary + typography suggestion

ตอบกลับเป็น JSON:
{
  "main_prompt": "detailed Midjourney prompt ending with ${mjAR} --style raw --v 6.1",
  "dalle_prompt": "DALL-E 3 prose prompt, same scene but written as a sentence",
  "text_overlay": "ข้อความไทย 1-2 บรรทัดสำหรับซ้อนบนภาพ",
  "negative_prompt": "blurry, text watermarks, cartoon, anime, unrealistic --no ...",
  "layout_spec": "composition and safe zone description",
  "canvas_size": "${canvas}",
  "brand_style": "primary #HEX, secondary #HEX — font suggestion — overall mood"
}`
}

function buildVideoPromptPrompt(req: Record<string, unknown>, content: Record<string, unknown>) {
  const duration = Number(req.video_duration ?? 60)
  const style = String(req.video_style ?? 'slideshow')
  const brief = String(req.brief ?? '')
  const lawCategoryLine = brief.match(/หมวดหมู่กฎหมาย: (.+)/)?.[1] ?? ''

  const sceneCount = duration <= 30 ? 3 : duration <= 60 ? 5 : duration <= 90 ? 7 : 10
  const secondsPerScene = Math.round(duration / sceneCount)

  const styleGuide: Record<string, string> = {
    talking_head: 'presenter talks directly to camera, professional background, good lighting, medium shot',
    slideshow: 'animated slides with text, smooth transitions, each slide 5-8 seconds, Ken Burns effect on images',
    animated: 'motion graphics, animated text and icons, brand colors, smooth animations',
    documentary: 'B-roll footage with voiceover, establishing shots, cutaway visuals, news-style',
  }
  const styleDesc = styleGuide[style] ?? styleGuide.slideshow

  const categoryMap: Record<string, string> = {
    'กฎหมายบริษัท': 'corporate', 'ภาษีและบัญชี': 'tax', 'อสังหาริมทรัพย์': 'property',
    'แรงงาน': 'labor', 'สัญญา': 'contract', 'อาญา': 'criminal', 'ครอบครัว/มรดก': 'family',
    'ทรัพย์สินทางปัญญา': 'ip', 'คดีความ/ฟ้องร้อง': 'litigation',
    'การเงิน/หลักทรัพย์': 'finance', 'วีซ่า/คนเข้าเมือง': 'immigration', 'สิ่งแวดล้อม/ผังเมือง': 'environment',
  }
  const firstCategory = (lawCategoryLine.split(',')[0]?.trim() ?? '')
  const categoryKey = categoryMap[firstCategory] ?? 'corporate'
  const brollContext = LAW_VISUAL_CONTEXT[categoryKey] ?? LAW_VISUAL_CONTEXT.corporate

  return `คุณเป็น video director และ script writer ผู้เชี่ยวชาญ short-form video สำหรับ Facebook/Instagram
สร้าง video brief ที่ละเอียด copy-paste ready ให้ลูกค้าเอาไปสร้างวิดีโอเองด้วย CapCut, RunwayML, Kling AI หรือจ้างทีม video

═══ BRIEF ═══
Topic: ${req.topic}
Law Category: ${lawCategoryLine || 'General Law'}
Duration: ${duration} วินาที (${sceneCount} scenes × ~${secondsPerScene}s)
Style: ${style} — ${styleDesc}
Tone: ${req.tone ?? 'professional'}

═══ CONTENT ═══
Title: ${String(content.title ?? '')}
Hook: ${String(content.hook ?? '')}
Body: ${String(content.body ?? '')}
CTA: ${String(content.cta ?? '')}

═══ VISUAL REFERENCE ═══
B-roll context: ${brollContext}

สร้าง video brief ที่ประกอบด้วย:
1. video_title: ชื่อวิดีโอ
2. hook: ประโยคเปิด 0-3 วินาทีแรก (ต้องหยุดคนเลื่อน feed)
3. scene_breakdown: array ของทุก scene พร้อม timestamp, visual direction, และ text on screen
4. voiceover_script: script เต็มทุกประโยค (ภาษาไทย natural speaking style)
5. visual_prompts: array ของ AI image/video prompts (English) สำหรับแต่ละ scene — ใช้กับ Runway, Kling, Pika ได้เลย
6. subtitle_text: ข้อความ subtitle หลักที่ต้องแสดงตลอดหรือช่วงสำคัญ
7. music_mood: อารมณ์ดนตรี background ที่เหมาะสม
8. text_animations: รายการ text/graphic animations สำคัญ
9. cta: call to action ช่วงสุดท้าย (3-5 วินาที)
10. tools_suggestion: แนะนำ tool ที่เหมาะกับ style นี้ (CapCut, RunwayML, Kling, Adobe Express)

ตอบกลับเป็น JSON:
{
  "video_title": "ชื่อวิดีโอ",
  "hook": "ประโยค hook 0-3 วินาที",
  "scene_breakdown": [
    {
      "scene": 1,
      "timestamp": "0:00-0:${secondsPerScene}",
      "visual": "visual direction ภาษาอังกฤษสำหรับ AI video",
      "text_on_screen": "ข้อความที่แสดงบนหน้าจอ",
      "voiceover": "บทพูดช่วงนี้",
      "transition": "cut / fade / slide"
    }
  ],
  "voiceover_script": "script เต็มทุกประโยค พร้อม [pause] markers",
  "visual_prompts": [
    "scene 1: cinematic shot of ... RunwayML prompt",
    "scene 2: ..."
  ],
  "subtitle_text": "ข้อความ subtitle หลัก",
  "music_mood": "เช่น corporate uplifting, calm professional, urgent dramatic",
  "text_animations": ["ชื่อเรื่อง fade-in ที่ 0:01", "bullet points slide-in ที่ 0:15"],
  "cta": "call to action ท้ายวิดีโอ",
  "tools_suggestion": "แนะนำ tool พร้อมเหตุผล"
}`
}

async function pollOnce() {
  try {
    const res = await fetch(`${APP_URL}/api/local/hermes/queue`)
    if (!res.ok) { console.error(`[hermes] Queue fetch failed: ${res.status}`); return }

    const jobs: Array<{ job: Record<string, unknown>; requirement: Record<string, unknown> }> = await res.json()
    if (!Array.isArray(jobs) || jobs.length === 0) return

    console.log(`[hermes] Processing ${jobs.length} job(s)`)
    for (const { job, requirement } of jobs) {
      console.log(`[hermes] Job ${job.id} — ${requirement.topic}`)
      await processJob(job, requirement, APP_URL)
    }
  } catch (err: unknown) {
    console.error(`[hermes] pollOnce error:`, err)
  }
}

const PUBLISH_INTERVAL = 5 * 60 * 1000 // 5 minutes

async function publishDue() {
  try {
    const res = await fetch(`${APP_URL}/api/local/calendar/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) return
    const data = await res.json() as { published?: number; message?: string }
    if (data.published && data.published > 0) {
      console.log(`[hermes] 📤 Published ${data.published} post(s) to Facebook`)
    }
  } catch {
    // silent — Next.js may not be up yet
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  console.log(`[hermes] Starting — polling ${APP_URL} every ${INTERVAL / 1000}s | publish check every ${PUBLISH_INTERVAL / 60000}min`)
  setInterval(pollOnce, INTERVAL)
  setInterval(publishDue, PUBLISH_INTERVAL)
  pollOnce()
  publishDue()

  process.on('SIGINT', () => { console.log('[hermes] Shutting down...'); process.exit(0) })
}
