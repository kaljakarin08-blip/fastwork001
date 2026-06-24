import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('command_logs').select('*').order('created_at', { ascending: false }).limit(100)
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
    const id = newId('log')
    const now = nowIso()
    const { error } = await sb.from('command_logs').insert({
      id, source: body.source ?? 'system', command_text: body.command_text,
      parsed_action: body.parsed_action ?? null, requirement_id: body.requirement_id ?? null,
      status: body.status ?? 'received', response_text: body.response_text ?? null, created_at: now,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
