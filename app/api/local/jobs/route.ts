import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('jobs').select('*').order('created_at', { ascending: false }).limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
