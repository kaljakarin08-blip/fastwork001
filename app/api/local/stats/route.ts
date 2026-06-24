import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const sb = getSupabase()
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    const [
      { count: todayCount },
      { count: outputReady },
      { count: reviewPending },
      { count: scheduled },
      { count: failed },
      { count: running },
    ] = await Promise.all([
      sb.from('requirements').select('*', { count: 'exact', head: true }).gte('created_at', today).lt('created_at', tomorrow),
      sb.from('requirements').select('*', { count: 'exact', head: true }).eq('status', 'output_ready'),
      sb.from('requirements').select('*', { count: 'exact', head: true }).in('status', ['review_pending', 'revision_requested']),
      sb.from('requirements').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    ])

    return NextResponse.json({
      today: todayCount ?? 0,
      output_ready: outputReady ?? 0,
      review_pending: reviewPending ?? 0,
      scheduled: scheduled ?? 0,
      failed: failed ?? 0,
      running: running ?? 0,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
