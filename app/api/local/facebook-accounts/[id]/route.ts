import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()
    const allowed = ['account_name', 'page_name', 'page_id', 'brand_voice', 'default_timezone',
      'default_posting_slots', 'status', 'notes', 'page_access_token', 'token_expires_at']
    const updates: Record<string, unknown> = { updated_at: now }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length <= 1) return NextResponse.json({ error: 'No fields' }, { status: 400 })
    const { error } = await sb.from('facebook_accounts').update(updates as any).eq('id', id)
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
    const { error } = await sb.from('facebook_accounts').update({ status: 'inactive', updated_at: nowIso() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
