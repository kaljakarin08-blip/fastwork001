import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const sb = getSupabase()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const facebook_account_id = searchParams.get('facebook_account_id')

    let query = sb
      .from('requirements')
      .select('*, facebook_accounts(page_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status)
    if (facebook_account_id) query = query.eq('facebook_account_id', facebook_account_id)

    const { data: rawData, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const data = rawData as any[] | null
    const rows = (data ?? []).map((r: any) => ({
      ...r,
      fb_page_name: (r.facebook_accounts as { page_name?: string } | null)?.page_name ?? null,
      facebook_accounts: undefined,
    }))

    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const id = newId('req')
    const jobId = newId('job')
    const now = nowIso()

    const { error: reqErr } = await sb.from('requirements').insert({
      id, title: body.title, topic: body.topic,
      brief: body.brief ?? null, target_audience: body.target_audience ?? null,
      objective: body.objective ?? null, tone: body.tone ?? null,
      platform: body.platform ?? 'facebook',
      facebook_account_id: body.facebook_account_id || null,
      content_type: body.content_type ?? 'post',
      image_direction: body.image_direction ?? null,
      layout_requirement: body.layout_requirement ?? null,
      video_create: body.video_create ? 1 : 0,
      video_style: body.video_style ?? null,
      video_duration: body.video_duration ?? null,
      preferred_post_date: body.preferred_post_date ?? null,
      preferred_post_time: body.preferred_post_time ?? null,
      priority: body.priority ?? 'normal',
      status: 'requested',
      notes: body.notes ?? null,
      created_at: now, updated_at: now,
    } as any)
    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })

    await sb.from('jobs').insert({
      id: jobId, requirement_id: id,
      job_type: 'content_production', status: 'pending',
      attempt_count: 0, created_at: now,
    } as any)

    return NextResponse.json({ id, job_id: jobId }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
