import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('creative_profiles').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()

    const { data, error } = await sb.from('creative_profiles').update({
      name: body.name,
      color_scheme: body.color_scheme ?? null,
      photography_style: body.photography_style ?? null,
      logo_usage: body.logo_usage ?? null,
      visual_mood: body.visual_mood ?? null,
      do_not_use: body.do_not_use ?? null,
      notes: body.notes ?? null,
      reference_image_urls: body.reference_image_urls ?? null,
      updated_at: now,
    }).eq('id', id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const { error } = await sb.from('creative_profiles').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
