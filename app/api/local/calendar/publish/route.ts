/**
 * POST /api/local/calendar/publish
 * Publishes due calendar items to Facebook.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'
import { postToFacebook, postPhotoToFacebook, postPhotoFileToFacebook, FacebookError } from '@/lib/facebook'

interface CalendarRow {
  id: string
  requirement_id: string
  facebook_account_id: string | null
  post_date: string
  post_time: string | null
  image_url: string | null
  caption_override: string | null
  scheduled_status: string
  page_id: string | null
  page_access_token: string | null
  hook: string | null
  caption: string | null
  body: string | null
  cta: string | null
  hashtags: string | null
}

function buildPermalink(pageId: string, postId: string): string {
  if (postId.includes('_')) {
    const [pid, storyId] = postId.split('_')
    return `https://www.facebook.com/permalink.php?story_fbid=${storyId}&id=${pid}`
  }
  return `https://www.facebook.com/photo/?fbid=${postId}`
}

function buildMessage(row: CalendarRow): string {
  if (row.caption_override) return row.caption_override
  const parts: string[] = []
  if (row.hook) parts.push(row.hook)
  if (row.caption) parts.push(row.caption)
  if (row.body) parts.push(row.body)
  if (row.cta) parts.push(row.cta)
  if (row.hashtags) parts.push(row.hashtags)
  return parts.join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json().catch(() => ({})) as { item_id?: string }
    const now = nowIso()
    const today = now.slice(0, 10)
    const currentTime = now.slice(11, 16)

    let rows: CalendarRow[] = []

    if (body.item_id) {
      const { data: rawItems } = await sb
        .from('calendar_items')
        .select('*, facebook_accounts(page_id, page_access_token)')
        .eq('id', body.item_id)
      const items = (rawItems ?? []) as any[]
      if (items.length > 0) {
        const item = items[0]
        const { data: output } = await sb.from('content_outputs').select('hook, caption, body, cta, hashtags').eq('requirement_id', item.requirement_id).single()
        const fa = item.facebook_accounts as { page_id?: string; page_access_token?: string } | null
        rows = [{ ...item, facebook_accounts: undefined, page_id: fa?.page_id ?? null, page_access_token: fa?.page_access_token ?? null, ...output }]
      }
    } else {
      const { data: rawItems } = await sb
        .from('calendar_items')
        .select('*, facebook_accounts(page_id, page_access_token)')
        .eq('scheduled_status', 'pending')
        .or(`post_date.lt.${today},and(post_date.eq.${today},post_time.lte.${currentTime}),and(post_date.eq.${today},post_time.is.null)`)
        .order('post_date', { ascending: true })
        .order('post_time', { ascending: true })
        .limit(20)

      for (const item of (rawItems ?? []) as any[]) {
        const { data: output } = await sb.from('content_outputs').select('hook, caption, body, cta, hashtags').eq('requirement_id', item.requirement_id).single()
        const fa = item.facebook_accounts as { page_id?: string; page_access_token?: string } | null
        rows.push({ ...item, facebook_accounts: undefined, page_id: fa?.page_id ?? null, page_access_token: fa?.page_access_token ?? null, ...(output ?? {}) })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, published: 0, message: 'Nothing due' })
    }

    const results: Array<{ id: string; ok: boolean; post_id?: string; permalink?: string; error?: string }> = []

    for (const row of rows) {
      if (!row.page_id || !row.page_access_token) {
        await sb.from('calendar_items').update({ scheduled_status: 'error', updated_at: now }).eq('id', row.id)
        await sb.from('requirements').update({ status: 'publish_failed', updated_at: now }).eq('id', row.requirement_id)
        results.push({ id: row.id, ok: false, error: 'missing_page_token' })
        continue
      }

      const message = buildMessage(row)
      if (!message.trim()) {
        results.push({ id: row.id, ok: false, error: 'empty_message' })
        continue
      }

      try {
        const isLocal = row.image_url && (row.image_url.startsWith('/generated/') || row.image_url.startsWith('public/'))
        const isRemote = row.image_url && row.image_url.startsWith('http')

        const postResult = isLocal
          ? await postPhotoFileToFacebook({
              pageId: row.page_id, token: row.page_access_token, message,
              localPath: row.image_url!.startsWith('/generated/') ? `public${row.image_url}` : row.image_url!,
            })
          : isRemote
          ? await postPhotoToFacebook({ pageId: row.page_id, token: row.page_access_token, message, imageUrl: row.image_url! })
          : await postToFacebook({ pageId: row.page_id, token: row.page_access_token, message })

        const permalink = buildPermalink(row.page_id, postResult.post_id)
        await sb.from('calendar_items').update({
          scheduled_status: 'published', fb_post_id: postResult.post_id,
          fb_permalink: permalink, published_at: now, updated_at: now,
        }).eq('id', row.id)
        await sb.from('requirements').update({ status: 'published', updated_at: now }).eq('id', row.requirement_id)
        results.push({ id: row.id, ok: true, post_id: postResult.post_id, permalink })
      } catch (err) {
        const msg = err instanceof FacebookError ? `FB ${err.code}: ${err.message}` : String(err)
        await sb.from('calendar_items').update({ scheduled_status: 'error', updated_at: now }).eq('id', row.id)
        await sb.from('requirements').update({ status: 'publish_failed', updated_at: now }).eq('id', row.requirement_id)
        results.push({ id: row.id, ok: false, error: msg })
      }
    }

    const published = results.filter(r => r.ok).length
    return NextResponse.json({ ok: true, published, total: rows.length, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
