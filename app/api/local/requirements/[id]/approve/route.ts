import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('requirements').select('status').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await sb.from('requirements').update({ status: 'approved', updated_at: nowIso() }).eq('id', id)
    return NextResponse.json({ ok: true, status: 'approved' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
