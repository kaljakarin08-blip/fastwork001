import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 5 } = await req.json()
    if (!query) return NextResponse.json([], { status: 200 })
    const sb = getSupabase()
    const { data, error } = await (sb as any)
      .from('rag_chunks')
      .select('path, title, content')
      .ilike('content', `%${query}%`)
      .limit(limit)

    if (error) throw error
    const rows = ((data ?? []) as Array<{ path: string; title: string; content: string }>).map((row) => ({
      ...row,
      score: 1,
    }))

    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
