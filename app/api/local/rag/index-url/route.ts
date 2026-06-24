/**
 * POST /api/local/rag/index-url
 * Fetch a URL (or Google Doc export), extract text, insert into RAG FTS5 index.
 * Body: { id: string }  — knowledge_sources row id
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

const CHUNK_SIZE = 800

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : fallback
}

function toGdriveExportUrl(url: string): string | null {
  let m = url.match(/docs\.google\.com\/document\/d\/([^/]+)/)
  if (m) return `https://docs.google.com/document/d/${m[1]}/export?format=txt`
  m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`
  m = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`
  return null
}

function chunkText(text: string, source: string, title: string): Array<{ path: string; title: string; content: string }> {
  const chunks: Array<{ path: string; title: string; content: string }> = []
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 20)
  let current = ''
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > CHUNK_SIZE && current.length > 0) {
      chunks.push({ path: `url://${source}`, title, content: current })
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current.length > 20) chunks.push({ path: `url://${source}`, title, content: current })
  return chunks
}

export async function POST(req: NextRequest) {
  const sb = getSupabase()
  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: source } = await sb.from('knowledge_sources').select('*').eq('id', id).single() as {
    data: { id: string; name: string; source_url: string; type: string } | null
  }
  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

  const now = nowIso()
  await sb.from('knowledge_sources').update({ status: 'indexing', error_message: null, updated_at: now }).eq('id', id)

  try {
    let fetchUrl = source.source_url
    let isPlainText = false
    const exportUrl = toGdriveExportUrl(source.source_url)
    if (exportUrl) {
      fetchUrl = exportUrl
      isPlainText = exportUrl.includes('format=txt') || exportUrl.includes('format=csv')
    }

    const res = await fetch(fetchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LawAIBot/1.0)' }, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

    const raw = await res.text()
    const contentType = res.headers.get('content-type') ?? ''

    let text: string
    let title: string
    if (isPlainText || contentType.includes('text/plain') || contentType.includes('text/csv')) {
      text = raw.trim()
      title = source.name
    } else {
      text = htmlToText(raw)
      title = extractTitle(raw, source.name)
    }

    if (!text || text.length < 50) throw new Error('Fetched content too short or empty — page may require login')

    const chunks = chunkText(text, source.source_url, title)
    if (chunks.length === 0) throw new Error('No chunks extracted')

    const ragChunks = (sb as any).from('rag_chunks')
    const { error: deleteError } = await ragChunks.delete().eq('source_id', id)
    if (deleteError) throw deleteError

    const { error: insertError } = await ragChunks.insert(
      chunks.map((chunk) => ({
        id: crypto.randomUUID(),
        source_id: id,
        path: chunk.path,
        title: chunk.title,
        content: chunk.content,
        created_at: now,
      }))
    )
    if (insertError) throw insertError

    await sb.from('knowledge_sources').update({ status: 'indexed', chunk_count: chunks.length, last_indexed_at: now, error_message: null, updated_at: now }).eq('id', id)
    return NextResponse.json({ ok: true, chunks: chunks.length, title })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sb.from('knowledge_sources').update({ status: 'error', error_message: msg, updated_at: now }).eq('id', id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
