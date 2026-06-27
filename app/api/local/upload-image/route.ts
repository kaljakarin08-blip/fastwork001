import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const BUCKET = 'uploads'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const filename = `upload_${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const sb = getSupabase()
    const { error } = await sb.storage.from(BUCKET).upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(filename)
    return NextResponse.json({ url: publicUrl, filename })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
