/**
 * Facebook Graph API — post text and photo to a Page
 * Requires: page_access_token stored in facebook_accounts table
 */

import fs from 'fs'
import path from 'path'

const GRAPH = 'https://graph.facebook.com/v21.0'

export interface FbPostResult {
  post_id: string
  permalink?: string
}

export class FacebookError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'FacebookError'
  }
}

async function graphPost(path: string, token: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ ...body, access_token: token })
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const json = await res.json() as Record<string, unknown>
  if (!res.ok || json.error) {
    const err = json.error as Record<string, unknown> | undefined
    throw new FacebookError(
      (err?.code as number) ?? res.status,
      (err?.message as string) ?? `HTTP ${res.status}`
    )
  }
  return json
}

/**
 * Post text-only to a Facebook Page feed.
 */
export async function postToFacebook(opts: {
  pageId: string
  token: string
  message: string
  scheduledPublishTime?: number // unix timestamp for scheduled posts
}): Promise<FbPostResult> {
  const body: Record<string, string> = { message: opts.message }
  if (opts.scheduledPublishTime) {
    body.scheduled_publish_time = String(opts.scheduledPublishTime)
    body.published = 'false'
  }
  const res = await graphPost(`${opts.pageId}/feed`, opts.token, body)
  return { post_id: res.id as string }
}

/**
 * Post photo + caption to a Facebook Page.
 * imageUrl must be a publicly accessible HTTPS URL.
 */
export async function postPhotoToFacebook(opts: {
  pageId: string
  token: string
  message: string
  imageUrl: string
  scheduledPublishTime?: number
}): Promise<FbPostResult> {
  const body: Record<string, string> = {
    url: opts.imageUrl,
    caption: opts.message,
  }
  if (opts.scheduledPublishTime) {
    body.scheduled_publish_time = String(opts.scheduledPublishTime)
    body.published = 'false'
  }
  const res = await graphPost(`${opts.pageId}/photos`, opts.token, body)
  return { post_id: res.id as string }
}

/**
 * Post photo from local file path (multipart upload) — works without public server.
 * localPath: absolute path OR relative to process.cwd() e.g. "public/generated/img.jpg"
 */
export async function postPhotoFileToFacebook(opts: {
  pageId: string
  token: string
  message: string
  localPath: string
  scheduledPublishTime?: number
}): Promise<FbPostResult> {
  const absPath = path.isAbsolute(opts.localPath)
    ? opts.localPath
    : path.join(process.cwd(), opts.localPath.startsWith('/') ? opts.localPath.slice(1) : opts.localPath)

  const fileBuffer = fs.readFileSync(absPath)
  const ext = path.extname(absPath).slice(1).toLowerCase()
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
  const mime = mimeMap[ext] ?? 'image/jpeg'

  const form = new FormData()
  form.append('source', new Blob([fileBuffer], { type: mime }), path.basename(absPath))
  form.append('caption', opts.message)
  form.append('access_token', opts.token)
  if (opts.scheduledPublishTime) {
    form.append('scheduled_publish_time', String(opts.scheduledPublishTime))
    form.append('published', 'false')
  }

  const res = await fetch(`${GRAPH}/${opts.pageId}/photos`, { method: 'POST', body: form })
  const json = await res.json() as Record<string, unknown>
  if (!res.ok || json.error) {
    const err = json.error as Record<string, unknown> | undefined
    throw new FacebookError((err?.code as number) ?? res.status, (err?.message as string) ?? `HTTP ${res.status}`)
  }
  return { post_id: json.id as string }
}

/**
 * Verify token is still valid — returns page name or throws.
 */
export async function verifyPageToken(pageId: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${pageId}?fields=name&access_token=${token}`)
  const json = await res.json() as Record<string, unknown>
  if (!res.ok || json.error) {
    const err = json.error as Record<string, unknown> | undefined
    throw new FacebookError(
      (err?.code as number) ?? res.status,
      (err?.message as string) ?? 'Token invalid'
    )
  }
  return json.name as string
}
