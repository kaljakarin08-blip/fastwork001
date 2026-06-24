import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('creative_profiles').select('*').order('name', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()
    const id = newId('cp')

    const { data, error } = await sb.from('creative_profiles').insert({
      id, name: body.name,
      color_scheme: body.color_scheme ?? null,
      photography_style: body.photography_style ?? null,
      logo_usage: body.logo_usage ?? null,
      visual_mood: body.visual_mood ?? null,
      do_not_use: body.do_not_use ?? null,
      notes: body.notes ?? null,
      reference_image_urls: body.reference_image_urls ?? null,
      created_at: now, updated_at: now,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
