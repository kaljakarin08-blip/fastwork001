import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function GET() {
  const sb = getSupabase()
  const { data } = await sb.from('app_settings').select('key, value').in('key', ['fb_app_id', 'fb_app_secret'])
  const cfg: Record<string, string> = {}
  for (const r of data ?? []) cfg[r.key] = r.value ?? ''
  return NextResponse.json({ fb_app_id: cfg.fb_app_id ?? '', fb_app_secret: cfg.fb_app_secret ?? '' })
}

export async function POST(req: NextRequest) {
  const { fb_app_id, fb_app_secret } = await req.json() as { fb_app_id?: string; fb_app_secret?: string }
  const sb = getSupabase()
  const now = nowIso()
  const rows = []
  if (fb_app_id !== undefined) rows.push({ key: 'fb_app_id', value: fb_app_id, updated_at: now })
  if (fb_app_secret !== undefined) rows.push({ key: 'fb_app_secret', value: fb_app_secret, updated_at: now })
  if (rows.length > 0) await sb.from('app_settings').upsert(rows, { onConflict: 'key' })
  return NextResponse.json({ ok: true })
}
