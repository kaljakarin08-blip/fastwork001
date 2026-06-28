/**
 * POST /api/local/rag/upload-pdf
 * รับ PDF file upload → extract text → chunk → store ใน rag_chunks
 * Body: multipart/form-data { file: File, name: string, law_category?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { newId, nowIso } from '@/lib/utils'
import { extractPdfText } from '@/lib/pdf-extract'

const CHUNK_SIZE = 800

function chunkText(text: string, sourceId: string, title: string) {
  const chunks: Array<{ path: string; title: string; content: string }> = []
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 20)
  let current = ''
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > CHUNK_SIZE && current.length > 0) {
      chunks.push({ path: `pdf://${sourceId}`, title, content: current })
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current.length > 20) chunks.push({ path: `pdf://${sourceId}`, title, content: current })
  return chunks
}

export async function POST(req: NextRequest) {
  const sb = getSupabase()
  const now = nowIso()

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string | null)?.trim() || ''
    const lawCategory = (formData.get('law_category') as string | null) || null

    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์ PDF' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'กรุณาระบุชื่อ source' }, { status: 400 })
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์ PDF ใหญ่เกิน 10MB' }, { status: 400 })
    }

    // 1. Extract text จาก PDF
    const arrayBuffer = await file.arrayBuffer()
    const text = await extractPdfText(Buffer.from(arrayBuffer))
    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'ไม่พบข้อความใน PDF — อาจเป็น scanned image หรือ PDF ที่ป้องกันการคัดลอก' }, { status: 422 })
    }

    // 2. Upload PDF ไปยัง Supabase Storage
    const storageKey = `rag-pdfs/${now}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await sb.storage
      .from('uploads')
      .upload(storageKey, arrayBuffer, { contentType: 'application/pdf', upsert: false })
    const storageUrl = uploadError ? null : sb.storage.from('uploads').getPublicUrl(storageKey).data.publicUrl

    // 3. สร้าง knowledge_source record
    const sourceId = newId('ks')
    const { error: insertErr } = await sb.from('knowledge_sources').insert({
      id: sourceId,
      type: 'pdf',
      name,
      source_url: storageUrl ?? `pdf-upload:${file.name}`,
      law_category: lawCategory,
      status: 'indexing',
      chunk_count: 0,
      error_message: null,
      created_at: now,
      updated_at: now,
    } as any)
    if (insertErr) throw new Error(insertErr.message)

    // 4. Chunk and insert ราก_chunks
    const chunks = chunkText(text, sourceId, name)
    if (chunks.length === 0) throw new Error('ไม่สามารถแบ่ง chunk จาก PDF ได้')

    const { error: chunkErr } = await (sb as any).from('rag_chunks').insert(
      chunks.map(c => ({
        id: crypto.randomUUID(),
        source_id: sourceId,
        path: c.path,
        title: c.title,
        content: c.content,
        created_at: now,
      }))
    )
    if (chunkErr) throw new Error(chunkErr.message)

    // 5. Update status → indexed
    await sb.from('knowledge_sources').update({
      status: 'indexed',
      chunk_count: chunks.length,
      last_indexed_at: now,
      updated_at: now,
    }).eq('id', sourceId)

    return NextResponse.json({ ok: true, sourceId, chunks: chunks.length, name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload-pdf] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
