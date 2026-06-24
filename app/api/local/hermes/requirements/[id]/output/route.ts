import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: requirement_id } = await params
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()
    const { content, image_prompt, video_prompt, rag_sources, generated_image_url } = body

    if (content) {
      await sb.from('content_outputs').delete().eq('requirement_id', requirement_id)
      await sb.from('content_outputs').insert({
        id: newId('co'), requirement_id,
        title: content.title ?? null, hook: content.hook ?? null,
        caption: content.caption ?? null, body: content.body ?? null,
        cta: content.cta ?? null, hashtags: content.hashtags ?? null,
        compliance_note: content.compliance_note ?? null,
        status: 'draft', created_at: now, updated_at: now,
      } as any)
    }

    if (image_prompt) {
      await sb.from('image_prompts').delete().eq('requirement_id', requirement_id)
      await sb.from('image_prompts').insert({
        id: newId('ip'), requirement_id,
        main_prompt: image_prompt.main_prompt ?? null,
        dalle_prompt: image_prompt.dalle_prompt ?? null,
        text_overlay: image_prompt.text_overlay ?? null,
        negative_prompt: image_prompt.negative_prompt ?? null,
        layout_spec: image_prompt.layout_spec ?? null,
        canvas_size: image_prompt.canvas_size ?? '1:1',
        safe_margin: image_prompt.safe_margin ?? null,
        brand_style: image_prompt.brand_style ?? null,
        status: 'draft', created_at: now, updated_at: now,
      } as any)
    }

    if (video_prompt) {
      await sb.from('video_prompts').delete().eq('requirement_id', requirement_id)
      const serializeField = (v: unknown): string | null => {
        if (v == null) return null
        if (typeof v === 'string') return v
        return JSON.stringify(v)
      }
      await sb.from('video_prompts').insert({
        id: newId('vp'), requirement_id,
        video_title: video_prompt.video_title ?? null,
        duration: video_prompt.duration ?? null,
        hook: video_prompt.hook ?? null,
        scene_breakdown: serializeField(video_prompt.scene_breakdown),
        voiceover_script: video_prompt.voiceover_script ?? null,
        visual_prompts: serializeField(video_prompt.visual_prompts),
        subtitle_text: video_prompt.subtitle_text ?? null,
        music_mood: video_prompt.music_mood ?? null,
        text_animations: serializeField(video_prompt.text_animations),
        tools_suggestion: video_prompt.tools_suggestion ?? null,
        cta: video_prompt.cta ?? null,
        status: 'draft', created_at: now, updated_at: now,
      } as any)
    }

    if (Array.isArray(rag_sources) && rag_sources.length > 0) {
      await sb.from('rag_sources').delete().eq('requirement_id', requirement_id)
      await sb.from('rag_sources').insert(
        rag_sources.map((src: { note_path: string; note_title: string; chunk_id: string; relevance_score?: number }) => ({
          id: newId('rs'), requirement_id,
          note_path: src.note_path, note_title: src.note_title,
          chunk_id: src.chunk_id, relevance_score: src.relevance_score ?? 0.5,
          used_in_output: 1, created_at: now,
        }))
      )
    }

    if (generated_image_url) {
      await sb.from('calendar_items').update({ image_url: generated_image_url, updated_at: now }).eq('requirement_id', requirement_id)
      await sb.from('image_prompts').update({ generated_image_url, updated_at: now }).eq('requirement_id', requirement_id)
    }

    await sb.from('requirements').update({ status: 'output_ready', updated_at: now }).eq('id', requirement_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
