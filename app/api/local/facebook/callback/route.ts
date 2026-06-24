import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/facebook-accounts?error=${encodeURIComponent(searchParams.get('error_description') ?? error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/facebook-accounts?error=no_code`)
  }

  const sb = getSupabase()
  const { data } = await sb.from('app_settings').select('key, value').in('key', ['fb_app_id', 'fb_app_secret'])
  const cfg: Record<string, string> = {}
  for (const r of data ?? []) cfg[r.key] = r.value ?? ''

  const redirectUri = `${appUrl}/api/local/facebook/callback`

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({ client_id: cfg.fb_app_id, redirect_uri: redirectUri, client_secret: cfg.fb_app_secret, code })
    )
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } }
    if (!tokenData.access_token) throw new Error(tokenData.error?.message ?? 'Token exchange failed')

    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: cfg.fb_app_id, client_secret: cfg.fb_app_secret, fb_exchange_token: tokenData.access_token })
    )
    const longData = await longRes.json() as { access_token?: string; error?: { message: string } }
    const userToken = longData.access_token ?? tokenData.access_token

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?` +
      new URLSearchParams({ access_token: userToken, fields: 'id,name,access_token,category' })
    )
    const pagesData = await pagesRes.json() as {
      data?: Array<{ id: string; name: string; access_token: string; category?: string }>
      error?: { message: string }
    }
    if (!pagesData.data) throw new Error(pagesData.error?.message ?? 'Failed to fetch pages')

    const now = nowIso()
    let upserted = 0
    for (const page of pagesData.data) {
      const { data: existing } = await sb.from('facebook_accounts').select('id').eq('page_id', page.id).single()
      if (existing) {
        await sb.from('facebook_accounts').update({ page_name: page.name, page_access_token: page.access_token, status: 'active', updated_at: now }).eq('id', existing.id)
      } else {
        await sb.from('facebook_accounts').insert({
          id: newId('fb'), account_name: page.name, page_name: page.name,
          page_id: page.id, page_access_token: page.access_token,
          status: 'active', default_timezone: 'Asia/Bangkok', created_at: now, updated_at: now,
        } as any)
      }
      upserted++
    }

    return NextResponse.redirect(`${appUrl}/dashboard/facebook-accounts?connected=${upserted}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(`${appUrl}/dashboard/facebook-accounts?error=${encodeURIComponent(msg)}`)
  }
}
