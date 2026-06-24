import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data } = await sb.from('app_settings').select('key, value').in('key', ['gdrive_folder_id', 'gdrive_service_account_email', 'gdrive_connected'])
    const cfg: Record<string, string> = {}
    for (const r of data ?? []) cfg[r.key] = r.value ?? ''
    return NextResponse.json(cfg)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const sb = getSupabase()
  const body = await req.json() as {
    action: 'save-config' | 'sync'
    gdrive_folder_id?: string
    gdrive_service_account_email?: string
    gdrive_service_account_key?: string
  }

  if (body.action === 'save-config') {
    const now = nowIso()
    const rows = []
    if (body.gdrive_folder_id !== undefined) rows.push({ key: 'gdrive_folder_id', value: body.gdrive_folder_id, updated_at: now })
    if (body.gdrive_service_account_email !== undefined) rows.push({ key: 'gdrive_service_account_email', value: body.gdrive_service_account_email, updated_at: now })
    if (body.gdrive_service_account_key !== undefined) rows.push({ key: 'gdrive_service_account_key', value: body.gdrive_service_account_key, updated_at: now })
    if (rows.length > 0) await sb.from('app_settings').upsert(rows, { onConflict: 'key' })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'sync') {
    const { data } = await sb.from('app_settings').select('key, value').in('key', ['gdrive_folder_id', 'gdrive_service_account_key'])
    const cfgMap: Record<string, string> = {}
    for (const r of data ?? []) cfgMap[r.key] = r.value ?? ''

    if (!cfgMap.gdrive_folder_id) return NextResponse.json({ error: 'gdrive_folder_id not configured' }, { status: 422 })
    if (!cfgMap.gdrive_service_account_key) return NextResponse.json({ error: 'Google service account key not configured' }, { status: 422 })

    try {
      const token = await getServiceAccountToken(cfgMap.gdrive_service_account_key)
      const files = await listDriveFiles(cfgMap.gdrive_folder_id, token)
      return NextResponse.json({ ok: true, files_found: files.length, files: files.map(f => f.name) })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function getServiceAccountToken(serviceAccountKeyJson: string): Promise<string> {
  const key = JSON.parse(serviceAccountKeyJson) as { client_email: string; private_key: string }
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/drive.readonly', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })).toString('base64url')
  const { createSign } = await import('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(key.private_key, 'base64url')
  const jwt = `${header}.${payload}.${sig}`
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(`Token error: ${data.error}`)
  return data.access_token
}

async function listDriveFiles(folderId: string, token: string): Promise<{ id: string; name: string; mimeType: string }[]> {
  const params = new URLSearchParams({ q: `'${folderId}' in parents and trashed=false`, fields: 'files(id,name,mimeType)', pageSize: '100' })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json() as { files?: { id: string; name: string; mimeType: string }[] }
  return data.files ?? []
}
