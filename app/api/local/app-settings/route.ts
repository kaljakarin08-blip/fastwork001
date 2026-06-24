import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

const ALLOWED_KEYS = [
  'openai_api_key', 'openai_model', 'hermes_model', 'anthropic_api_key',
  'default_timezone', 'hermes_poll_interval', 'default_word_count',
  'default_content_type', 'hermes_system_prompt', 'setup_complete',
]

export async function GET() {
  try {
    const sb = getSupabase()
    const { data } = await sb.from('app_settings').select('key, value, updated_at')
    const result: Record<string, string | null> = {}
    for (const r of data ?? []) result[r.key] = r.value
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json() as Record<string, string>
    const now = nowIso()

    const rows = ALLOWED_KEYS
      .filter(key => key in body)
      .map(key => ({ key, value: body[key] ?? '', updated_at: now }))

    if (rows.length > 0) {
      await sb.from('app_settings').upsert(rows, { onConflict: 'key' })
    }

    const { data } = await sb.from('app_settings').select('key, value')
    const result: Record<string, string | null> = {}
    for (const r of data ?? []) result[r.key] = r.value
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
