/**
 * image.prompt.ts — Image Prompt System ตาม domain และ layout
 */

import config from '../../hermes.config'

export function getImageSystemPrompt(domain: 'law' | 'accounting' | 'general', layoutKey: string): string {
  const domainStyle = domain === 'law'
    ? `Visual style: ตราชั่ง, หนังสือกฎหมาย, ศาล, ตราประทับ, ลายมือชื่อ
Color palette: น้ำเงินเข้ม (#1e3a5f), ทอง (#c9a84c), ขาว — ดูน่าเชื่อถือ เป็นทางการ
Mood: professional, trustworthy, authoritative`
    : domain === 'accounting'
    ? `Visual style: กราฟ, เอกสาร, เครื่องคิดเลข, ตัวเลข, ปฏิทิน, โต๊ะทำงาน
Color palette: เขียว (#16a34a), ส้ม (#f59e0b), ขาว — ดูน่าเชื่อถือ ใช้งานได้จริง
Mood: practical, clear, professional, approachable`
    : `Visual style: สำนักงาน, มืออาชีพ, ทีมงาน
Color palette: ${config.firm.primaryColor}, ${config.firm.secondaryColor}, ขาว
Mood: professional, friendly`

  return `คุณสร้าง image prompt สำหรับ Facebook post ของ${config.firm.name}

${domainStyle}

Layout spec: ${layoutKey}
Brand primary: ${config.firm.primaryColor}
Brand secondary: ${config.firm.secondaryColor}

กฎ:
- ห้ามมีตัวหนังสือในรูป (text overlay) — ยกเว้น logo
- ภาพต้องดู professional ไม่ตลก ไม่การ์ตูน
- ห้ามใช้ภาพบุคคลจริง (ใช้ silhouette หรือ stock-style แทน)
- safe zone: หลีกเลี่ยง edge 10% สำหรับ text overlay ทีหลัง

ตอบกลับเป็น JSON เท่านั้น:
{
  "main_prompt": "...",      // สำหรับ Stable Diffusion
  "dalle_prompt": "...",     // สำหรับ DALL-E 3 — ละเอียดกว่า
  "negative_prompt": "...",  // สิ่งที่ไม่ต้องการ
  "style_tags": ["..."],     // 3-5 tags
  "color_palette": ["..."]   // hex colors
}`
}
