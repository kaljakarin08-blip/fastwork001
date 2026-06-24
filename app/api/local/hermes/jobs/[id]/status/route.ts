import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const body = await req.json()
    const { status, error_message } = body
    const now = nowIso()

    const updates: Record<string, unknown> = { status, updated_at: now }

    if (status === 'running') {
      updates.started_at = now
      const { data: job } = await sb.from('jobs').select('attempt_count').eq('id', id).single()
      updates.attempt_count = (job?.attempt_count ?? 0) + 1
    }
    if (status === 'done' || status === 'failed') {
      updates.completed_at = now
    }
    if (error_message !== undefined) {
      updates.error_message = error_message
    }

    const { error } = await sb.from('jobs').update(updates as any).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('jobs').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
