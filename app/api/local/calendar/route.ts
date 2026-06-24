import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data: items, error } = await sb
      .from('calendar_items')
      .select('*')
      .not('post_date', 'is', null)
      .order('post_date', { ascending: true })
      .order('post_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!items || items.length === 0) return NextResponse.json([])

    const reqIds = [...new Set(items.map(i => i.requirement_id))]
    const fbIds = [...new Set(items.map(i => i.facebook_account_id).filter(Boolean))]

    const [{ data: reqs }, { data: outputs }, { data: fbAccounts }] = await Promise.all([
      sb.from('requirements').select('id, title, topic, content_type, status').in('id', reqIds),
      sb.from('content_outputs').select('requirement_id, caption, body, hashtags').in('requirement_id', reqIds),
      fbIds.length > 0
        ? sb.from('facebook_accounts').select('id, page_name').in('id', fbIds as string[])
        : Promise.resolve({ data: [] }),
    ])

    const reqMap = Object.fromEntries((reqs ?? []).map(r => [r.id, r]))
    const outMap = Object.fromEntries((outputs ?? []).map(o => [o.requirement_id, o]))
    const fbMap = Object.fromEntries((fbAccounts ?? []).map(f => [f.id, f]))

    const rows = items.map(ci => ({
      ...ci,
      title: reqMap[ci.requirement_id]?.title,
      topic: reqMap[ci.requirement_id]?.topic,
      content_type: reqMap[ci.requirement_id]?.content_type,
      req_status: reqMap[ci.requirement_id]?.status,
      caption: outMap[ci.requirement_id]?.caption,
      body: outMap[ci.requirement_id]?.body,
      hashtags: outMap[ci.requirement_id]?.hashtags,
      page_name: ci.facebook_account_id ? fbMap[ci.facebook_account_id]?.page_name : null,
    }))

    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
