import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data } = await sb.from('brand_profile').select('*').eq('id', 'default').single()
    return NextResponse.json(data ?? {})
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()
    const allowed = [
      'firm_name', 'tagline', 'logo_url', 'primary_color', 'secondary_color',
      'default_tone', 'default_target_audience', 'website_url', 'email',
      'phone', 'line_id', 'address', 'facebook_bio',
    ]
    const updates: Record<string, unknown> = { updated_at: now }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }
    if (Object.keys(updates).length <= 1) return NextResponse.json({ error: 'No fields' }, { status: 400 })

    const { data, error } = await sb.from('brand_profile').update(updates as any).eq('id', 'default').select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
