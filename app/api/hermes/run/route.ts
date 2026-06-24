import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { getSetting } from '@/lib/local-db/get-setting'
import { processJob } from '@/hermes/worker'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const sb = getSupabase()

  const { data: jobs, error } = await (sb as any)
    .from('jobs')
    .select('id, requirement_id, requirements(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: null })
  }

  const row = jobs[0] as any
  const jobId: string = row.id
  const reqId: string = row.requirement_id
  const requirement = row.requirements as Record<string, unknown> | null

  if (!requirement) {
    return NextResponse.json({ ok: false, error: 'requirement missing' }, { status: 500 })
  }

  const now = new Date().toISOString()
  await sb.from('jobs').update({ status: 'running', started_at: now }).eq('id', jobId)
  await sb.from('requirements').update({ status: 'content_generating' }).eq('id', reqId)

  try {
    const openaiKey = await getSetting('openai_api_key', 'OPENAI_API_KEY')
    if (!openaiKey) throw new Error('OpenAI API key ไม่ได้ตั้งค่า')

    await processJob({ id: jobId }, requirement, req.nextUrl.origin)
    return NextResponse.json({ ok: true, processed: jobId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sb.from('jobs').update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() }).eq('id', jobId)
    await sb.from('requirements').update({ status: 'failed' }).eq('id', reqId)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
