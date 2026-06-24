import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function GET() {
  const sb = getSupabase()
  const { data } = await sb.from('app_settings').select('key, value').in('key', ['fb_app_id', 'fb_app_secret'])
  const cfg: Record<string, string> = {}
  for (const r of data ?? []) cfg[r.key] = r.value ?? ''

  if (!cfg.fb_app_id || !cfg.fb_app_secret) {
    return NextResponse.json({ error: 'App ID และ App Secret ยังไม่ได้ตั้งค่า' }, { status: 422 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/local/facebook/callback`

  const params = new URLSearchParams({
    client_id: cfg.fb_app_id,
    redirect_uri: redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
    response_type: 'code',
  })

  return NextResponse.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`)
}
