import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('facebook_accounts')
      .select('*')
      .eq('status', 'active')
      .order('account_name', { ascending: true })
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
    const id = newId('fb')
    const now = nowIso()

    const { error } = await sb.from('facebook_accounts').insert({
      id, account_name: body.account_name, page_name: body.page_name,
      page_id: body.page_id ?? null, brand_voice: body.brand_voice ?? null,
      default_timezone: body.default_timezone ?? 'Asia/Bangkok',
      default_posting_slots: body.default_posting_slots ?? null,
      page_access_token: body.page_access_token || null,
      token_expires_at: body.token_expires_at || null,
      status: 'active', notes: body.notes ?? null, created_at: now, updated_at: now,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
