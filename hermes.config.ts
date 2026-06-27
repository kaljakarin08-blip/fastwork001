/**
 * hermes.config.ts — Client Configuration
 * ==========================================
 * ลูกค้าแก้ไฟล์นี้เพียงไฟล์เดียว ไม่ต้องแตะโค้ดอื่น
 *
 * วิธีใช้:
 * 1. แก้ไข firmName, domain, contentLength ให้ตรงกับสำนักงาน
 * 2. ใส่ API endpoint ที่ได้รับจาก Hermes team
 * 3. บันทึกไฟล์ → รีสตาร์ทแอป
 */

const config = {
  // ─── ข้อมูลสำนักงาน ────────────────────────────────────────────
  firm: {
    name: 'สำนักงานกฎหมาย [ชื่อสำนักงาน]',   // ← แก้ตรงนี้
    shortName: '[ชื่อย่อ]',                     // ← ใช้ใน hashtag
    website: '',                                 // ← optional
    primaryColor: '#1e3a5f',                    // ← สีหลัก brand
    secondaryColor: '#c9a84c',                  // ← สีรอง
  },

  // ─── Domain หลักที่ทำ content ──────────────────────────────────
  // 'law'        = กฎหมายอย่างเดียว
  // 'accounting' = บัญชี/ภาษีอย่างเดียว
  // 'both'       = ทั้งสองอย่าง (ใช้ domain tag ต่อ requirement)
  domain: 'law' as 'law' | 'accounting' | 'both',

  // ─── ความยาว content ────────────────────────────────────────────
  content: {
    minWords: 800,    // คำขั้นต่ำ
    maxWords: 1500,   // คำสูงสุด
    language: 'th',  // ภาษาหลัก
  },

  // ─── Hermes API (ได้รับจาก Hermes team) ────────────────────────
  // ระบบจะส่ง request ไปที่ endpoint นี้เพื่อสร้าง content
  // ไม่ต้องมี OpenAI/Anthropic key เอง
  api: {
    endpoint: 'https://api.hermes.app',  // ← ได้รับจาก Hermes team
    clientId: '',                          // ← ได้รับจาก Hermes team
    clientSecret: '',                      // ← ได้รับจาก Hermes team
  },

  // ─── ตั้งค่า Hermes Worker ──────────────────────────────────────
  worker: {
    pollIntervalSeconds: 60,    // ตรวจ queue ทุกกี่วินาที
    maxRetries: 3,              // retry สูงสุดกี่ครั้ง
    autoBackupDaily: true,      // backup database รายวัน
  },

  // ─── Facebook (optional) ────────────────────────────────────────
  facebook: {
    autoPublish: false,   // true = โพสต์อัตโนมัติ, false = รอ approve
  },
}

export default config
export type HermesConfig = typeof config
