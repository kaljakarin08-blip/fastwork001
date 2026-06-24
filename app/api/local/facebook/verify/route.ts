import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const sb = getSupabase()
  const { data: fa } = await sb.from('facebook_accounts').select('id, page_name, page_id, page_access_token').eq('id', accountId).single()
  if (!fa) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (!fa.page_access_token) return NextResponse.json({ ok: false, error: 'No page_access_token set' })
  if (!fa.page_id) return NextResponse.json({ ok: false, error: 'No page_id set' })

  try {
    const [debugRes, pageRes] = await Promise.all([
      fetch(`${GRAPH}/debug_token?input_token=${fa.page_access_token}&access_token=${fa.page_access_token}`),
      fetch(`${GRAPH}/${fa.page_id}?fields=name,id,fan_count&access_token=${fa.page_access_token}`),
    ])
    const debugData = await debugRes.json() as { data?: { type?: string; is_valid?: boolean; scopes?: string[]; expires_at?: number } }
    const pageData = await pageRes.json() as { id?: string; name?: string; fan_count?: number; error?: { code: number; message: string } }

    if (pageData.error) {
      return NextResponse.json({ ok: false, error: `FB ${pageData.error.code}: ${pageData.error.message}`, token_info: debugData.data, page_id_used: fa.page_id })
    }

    return NextResponse.json({
      ok: true,
      page_name: pageData.name, page_id: pageData.id, fan_count: pageData.fan_count,
      token_type: debugData.data?.type, token_valid: debugData.data?.is_valid,
      token_scopes: debugData.data?.scopes,
      token_expires: debugData.data?.expires_at ? new Date(debugData.data.expires_at * 1000).toISOString() : 'never',
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
