import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

// POST /api/local/jobs/retry
// Reset all failed jobs → pending และ reset requirement status → pending
export async function POST() {
  try {
    const sb = getSupabase()
    const now = nowIso()

    // ดึง failed jobs
    const { data: failedJobs, error: fetchErr } = await sb
      .from('jobs')
      .select('id, requirement_id')
      .eq('status', 'failed')

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!failedJobs?.length) return NextResponse.json({ reset: 0 })

    const jobIds = failedJobs.map(j => j.id)
    const reqIds = [...new Set(failedJobs.map(j => j.requirement_id))]

    // Reset jobs → pending
    const { error: jobErr } = await sb
      .from('jobs')
      .update({ status: 'pending', attempt_count: 0, error_message: null, updated_at: now })
      .in('id', jobIds)

    if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 })

    // Reset requirements → pending
    await sb
      .from('requirements')
      .update({ status: 'pending', updated_at: now })
      .in('id', reqIds)

    return NextResponse.json({ reset: jobIds.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
