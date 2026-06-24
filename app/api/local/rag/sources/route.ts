import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com')
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('knowledge_sources').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json() as { name: string; source_url: string; type?: string; notes?: string }
    if (!body.name || !body.source_url) {
      return NextResponse.json({ error: 'name and source_url required' }, { status: 400 })
    }
    const id = newId('ks')
    const now = nowIso()
    const type = body.type ?? (isGoogleDriveUrl(body.source_url) ? 'gdrive' : 'url')
    const { error } = await sb.from('knowledge_sources').insert({
      id, type, name: body.name, source_url: body.source_url,
      status: 'pending', chunk_count: 0, notes: body.notes ?? null,
      created_at: now, updated_at: now,
    } as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sb = getSupabase()
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('knowledge_sources').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
