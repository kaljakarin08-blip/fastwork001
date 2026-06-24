import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

function randomTimeInWindow(startHour: number, endHour: number): string {
  const h = startHour + Math.floor(Math.random() * (endHour - startHour))
  const m = Math.floor(Math.random() * 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function isWeekday(dateStr: string): boolean {
  const day = new Date(dateStr).getDay()
  return day !== 0 && day !== 6
}

function findNextAvailableDate(startDate: string, usedDates: Set<string>, weekdayOnly: boolean): string {
  let d = startDate
  for (let i = 0; i < 365; i++) {
    const candidate = addDays(d, i === 0 ? 0 : 1)
    d = candidate
    if (weekdayOnly && !isWeekday(d)) continue
    if (!usedDates.has(d)) return d
  }
  return addDays(startDate, 30)
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json() as {
      requirement_id: string
      facebook_account_id: string
      image_url?: string
      caption_override?: string
      post_date?: string
      post_time?: string
      auto_random?: boolean
      start_date?: string
      skip_days?: number
      weekday_only?: boolean
      time_start?: number
      time_end?: number
    }
    const now = nowIso()

    let postDate: string
    let postTime: string

    if (body.auto_random) {
      const { data: used } = await sb.from('calendar_items').select('post_date').not('post_date', 'is', null)
      const usedDates = new Set((used ?? []).map(r => r.post_date as string))
      const baseDate = body.start_date ?? now.slice(0, 10)
      const startFrom = addDays(baseDate, body.skip_days ?? 1)
      postDate = findNextAvailableDate(startFrom, usedDates, body.weekday_only ?? true)
      postTime = randomTimeInWindow(body.time_start ?? 9, body.time_end ?? 18)
    } else {
      if (!body.post_date) return NextResponse.json({ error: 'post_date required' }, { status: 400 })
      postDate = body.post_date
      postTime = body.post_time ?? randomTimeInWindow(9, 18)
    }

    await sb.from('calendar_items').delete().eq('requirement_id', body.requirement_id)

    const id = newId('ci')
    const { error } = await sb.from('calendar_items').insert({
      id, requirement_id: body.requirement_id,
      facebook_account_id: body.facebook_account_id || null,
      post_date: postDate, post_time: postTime,
      image_url: body.image_url || null,
      caption_override: body.caption_override || null,
      status: 'scheduled', scheduled_status: 'pending',
      created_at: now, updated_at: now,
    } as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('requirements').update({ status: 'scheduled', updated_at: now }).eq('id', body.requirement_id)

    return NextResponse.json({ ok: true, post_date: postDate, post_time: postTime, id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
