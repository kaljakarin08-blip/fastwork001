import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data: rawData, error } = await sb
      .from('jobs')
      .select(`
        id, requirement_id, job_type, status, attempt_count, error_message,
        started_at, completed_at, created_at,
        requirements (
          id, title, topic, brief, target_audience, objective, tone, platform,
          facebook_account_id, creative_profile_id, content_type, image_direction,
          layout_requirement, video_create, video_style, video_duration,
          preferred_post_date, preferred_post_time, priority, status, notes,
          created_at, updated_at
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const data = rawData as any[] | null
    const result = (data ?? []).map((row: any) => ({
      job: {
        id: row.id,
        requirement_id: row.requirement_id,
        job_type: row.job_type,
        status: row.status,
        attempt_count: row.attempt_count,
        error_message: row.error_message,
        started_at: row.started_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
      },
      requirement: row.requirements,
    }))

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
