import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSetting } from '@/lib/local-db/get-setting'

export async function POST(req: NextRequest) {
  try {
    const { law_categories, hint, count } = await req.json() as {
      law_categories: string[]
      hint: string
      count: number
    }

    const openai = new OpenAI({ apiKey: await getSetting('openai_api_key', 'OPENAI_API_KEY') })

    const categoryContext = law_categories?.length
      ? `สาขากฎหมาย: ${law_categories.join(', ')}`
      : 'กฎหมายทั่วไป'

    const hintLine = hint?.trim() ? `แนวคิดเพิ่มเติม: ${hint}` : ''

    const prompt = `คุณเป็น content strategist ผู้เชี่ยวชาญ Facebook content สำหรับสำนักงานกฎหมายไทย

${categoryContext}
${hintLine}

สร้าง ${count} หัวข้อ Facebook post ที่:
- ตรงกับสาขากฎหมายที่ระบุ
- น่าสนใจสำหรับคนไทยทั่วไปที่ต้องการข้อมูลกฎหมาย
- ไม่เหมือนกัน — หลากหลายมุมมอง (เช่น ให้ความรู้, FAQ, เตือนภัย, case study, update กฎหมายใหม่)
- เป็นภาษาไทย กระชับ เข้าใจง่าย
- แต่ละหัวข้อยาว 1 บรรทัด ไม่เกิน 15 คำ

ตอบกลับเป็น JSON:
{ "topics": ["หัวข้อ 1", "หัวข้อ 2", ...] }`

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    })

    const data = JSON.parse(res.choices[0]?.message?.content ?? '{}') as { topics?: string[] }
    const topics: string[] = Array.isArray(data.topics) ? data.topics.slice(0, count) : []

    return NextResponse.json({ topics })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
