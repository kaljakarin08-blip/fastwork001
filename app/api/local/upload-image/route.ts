import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

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
    const outDir = path.join(process.cwd(), 'public', 'generated')
    fs.mkdirSync(outDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(path.join(outDir, filename), buffer)

    return NextResponse.json({ url: `/generated/${filename}`, filename })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
