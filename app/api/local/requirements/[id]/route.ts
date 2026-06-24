import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()

    const { data: rawReq, error } = await sb
      .from('requirements')
      .select('*, facebook_accounts(page_name, account_name)')
      .eq('id', id)
      .single()

    if (error || !rawReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const req = rawReq as any

    const [
      { data: outputs },
      { data: imagePrompts },
      { data: videoPrompts },
      { data: ragSources },
      { data: calendarItems },
      { data: jobs },
      { data: fbAccounts },
    ] = await Promise.all([
      sb.from('content_outputs').select('*').eq('requirement_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('image_prompts').select('*').eq('requirement_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('video_prompts').select('*').eq('requirement_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('rag_sources').select('*').eq('requirement_id', id).order('relevance_score', { ascending: false }),
      sb.from('calendar_items').select('*').eq('requirement_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('jobs').select('*').eq('requirement_id', id).order('created_at', { ascending: false }).limit(5),
      sb.from('facebook_accounts').select('*').eq('status', 'active').order('page_name', { ascending: true }),
    ])

    const fbData = req.facebook_accounts as { page_name?: string; account_name?: string } | null

    return NextResponse.json({
      ...req,
      facebook_accounts: undefined,
      fb_page_name: fbData?.page_name ?? null,
      fb_account_name: fbData?.account_name ?? null,
      output: outputs?.[0] ?? null,
      image_prompt: imagePrompts?.[0] ?? null,
      video_prompt: videoPrompts?.[0] ?? null,
      rag_sources: ragSources ?? [],
      calendar: calendarItems?.[0] ?? null,
      jobs: jobs ?? [],
      fb_accounts: fbAccounts ?? [],
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()

    const allowed = ['title', 'topic', 'brief', 'target_audience', 'objective', 'tone', 'platform',
      'facebook_account_id', 'content_type', 'image_direction', 'layout_requirement', 'video_create',
      'video_style', 'video_duration', 'preferred_post_date', 'preferred_post_time', 'priority', 'status', 'notes']

    const updates: Record<string, unknown> = { updated_at: now }
    const fkNullable = new Set(['facebook_account_id', 'creative_profile_id'])
    for (const key of allowed) {
      if (key in body) {
        updates[key] = fkNullable.has(key) && body[key] === '' ? null : body[key]
      }
    }
    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await sb.from('requirements').update(updates as any).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    await Promise.all([
      sb.from('jobs').delete().eq('requirement_id', id),
      sb.from('rag_sources').delete().eq('requirement_id', id),
      sb.from('content_outputs').delete().eq('requirement_id', id),
      sb.from('image_prompts').delete().eq('requirement_id', id),
      sb.from('video_prompts').delete().eq('requirement_id', id),
      sb.from('calendar_items').delete().eq('requirement_id', id),
    ])
    await sb.from('requirements').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
