import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { nowIso } from '@/lib/utils'

const BRAND_DEFAULTS = {
  firm_name: 'สำนักงานกฎหมาย ไทยลอว์ แอนด์ แอสโซซิเอทส์',
  tagline: 'ที่ปรึกษากฎหมาย เชื่อถือได้ ใส่ใจทุกคดี',
  primary_color: '#1e3a5f',
  secondary_color: '#d4a853',
  default_tone: 'professional',
  default_target_audience: 'ผู้ประกอบการ SME เจ้าของธุรกิจ และบุคคลทั่วไปที่ต้องการคำปรึกษากฎหมายในประเทศไทย',
  website_url: 'https://thailawassociates.com',
  email: 'contact@thailawassociates.com',
  phone: '02-XXX-XXXX',
  line_id: '@thailaw',
  address: 'กรุงเทพมหานคร ประเทศไทย',
  facebook_bio: 'สำนักงานกฎหมายครบวงจร บริการด้านกฎหมายแรงงาน บริษัท สัญญา และอสังหาริมทรัพย์ ปรึกษาฟรีครั้งแรก',
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data } = await sb.from('brand_profile').select('*').eq('id', 'default').single()
    if (!data) return NextResponse.json({ id: 'default', ...BRAND_DEFAULTS })
    // Fill null/invalid fields with defaults
    const merged = { ...data }
    for (const [k, v] of Object.entries(BRAND_DEFAULTS)) {
      if (merged[k] == null) merged[k] = v
    }
    // Fix email if it was overwritten with line_id value or isn't a valid email
    const emailStr = String(merged.email ?? '')
    const isValidEmail = emailStr.includes('@') && emailStr.includes('.')
    if (!isValidEmail || merged.email === merged.line_id) merged.email = BRAND_DEFAULTS.email
    return NextResponse.json(merged)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const now = nowIso()
    const allowed = [
      'firm_name', 'tagline', 'logo_url', 'primary_color', 'secondary_color',
      'default_tone', 'default_target_audience', 'website_url', 'email',
      'phone', 'line_id', 'address', 'facebook_bio',
    ]
    const updates: Record<string, unknown> = { updated_at: now }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }
    if (Object.keys(updates).length <= 1) return NextResponse.json({ error: 'No fields' }, { status: 400 })

    const { data, error } = await sb.from('brand_profile').update(updates as any).eq('id', 'default').select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? {})
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
