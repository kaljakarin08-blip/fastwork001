# คู่มือการใช้งาน Law AI Content OS
> สำหรับ: ทีมสำนักงานกฎหมาย | เวอร์ชัน 1.0

---

## ติดตั้งครั้งแรก (5 นาที)

### ขั้นตอนที่ 1 — ติดตั้ง app

1. เปิดไฟล์ `Law AI Content OS-x.x.x.dmg`
2. ลาก **Law AI Content OS** ไปใส่โฟลเดอร์ **Applications**
3. ดับเบิลคลิกเพื่อเปิด
4. ถ้า macOS แจ้ง "นักพัฒนาซอฟต์แวร์ที่ไม่รู้จัก" → เปิด **System Settings → Privacy & Security → Open Anyway**

---

### ขั้นตอนที่ 2 — ตั้งค่าครั้งแรก (Setup Wizard)

เมื่อเปิด app ครั้งแรก จะมีหน้า Setup ขึ้นมาอัตโนมัติ:

**1. OpenAI API Key**
- ไปที่ [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- คลิก **Create new secret key**
- Copy key ที่ขึ้นต้นด้วย `sk-...`
- วางใน Setup Wizard → กด **ทดสอบ API Key** → รอให้ขึ้น "เชื่อมต่อสำเร็จ"
- กด **ถัดไป**

**2. ชื่อสำนักงาน**
- กรอกชื่อสำนักงานเต็ม เช่น "สำนักงานกฎหมาย สมชาย แอนด์ พาร์ทเนอร์ส"
- กด **เริ่มใช้งาน**

---

### ขั้นตอนที่ 3 — เชื่อม Obsidian Vault (ถ้ามี)

ถ้ามีเอกสารกฎหมายใน Obsidian ที่ต้องการให้ Hermes ใช้เป็นข้อมูลอ้างอิง:

1. เปิด Terminal
2. รันคำสั่ง:
```bash
cd /Applications/Law\ AI\ Content\ OS.app/Contents/Resources
pnpm rag:index
```
3. รอประมาณ 2-5 นาที (ขึ้นอยู่กับจำนวนไฟล์)

> **หมายเหตุ:** ทำครั้งแรกเท่านั้น และทำซ้ำเมื่อมีเอกสารใหม่เพิ่มเข้ามา

---

## การสร้างคอนเทนต์

### สร้าง Post ใหม่

1. คลิก **Requirements** ในเมนูซ้าย
2. คลิก **+ สร้าง Requirement ใหม่**
3. กรอกข้อมูล:
   - **หมวดหมู่กฎหมาย** — เลือก 1-3 หมวดหมู่
   - **Topic** — ใส่หัวข้อที่ต้องการ **หรือ** ปล่อยว่างเพื่อให้ Hermes เลือกให้อัตโนมัติ
   - **ประเภทคอนเทนต์** — Post / Carousel / Reels
   - **จำนวนคำ** — 500-1500 คำ (default: 1000)
4. กด **Submit** — Hermes จะเริ่มทำงานอัตโนมัติ

### ดูสถานะ

- **Queue** — คอนเทนต์ที่รอ Hermes ประมวลผล
- **Outputs** — คอนเทนต์ที่เสร็จแล้ว พร้อมอ่านและอนุมัติ
- สถานะจะอัปเดตอัตโนมัติ ไม่ต้อง refresh

### อนุมัติและโพสต์

1. เปิดคอนเทนต์ที่ต้องการ
2. อ่านตรวจทาน แก้ไขถ้าต้องการ
3. กด **Approve** → คอนเทนต์พร้อมโพสต์
4. เลือก platform และเวลาโพสต์

---

## System Tray

App จะทำงานอยู่ใน menubar ตลอดเวลา:

- **คลิก icon นาฬิกา** ใน menubar → เลือก "เปิด Law AI OS"
- **Hermes: Running ●** — หมายความว่า background worker ทำงานปกติ
- **Quit** — ปิด app และหยุด Hermes ทั้งหมด

> ปิดหน้าต่าง app ≠ ปิดโปรแกรม — Hermes ยังทำงานอยู่ใน background

---

## FAQ

**Q: Hermes ไม่ทำงาน / สถานะค้างที่ "queued"**
- ตรวจสอบว่า OpenAI API Key ยังใช้งานได้ (Settings → API Keys → Test Connection)
- ตรวจสอบ internet connection
- ปิดแล้วเปิด app ใหม่

**Q: ข้อมูลหาย หลังติดตั้งใหม่**
- ข้อมูลทั้งหมดเก็บที่ `~/Library/Application Support/Law AI Content OS/data/local.db`
- ก่อนลบ app ให้ backup ไฟล์นี้ไว้ก่อน

**Q: อัปเดต app**
- ดาวน์โหลด `.dmg` ใหม่ → ลาก app ไปทับของเก่าใน Applications
- ข้อมูลทั้งหมดยังอยู่ครบ (เก็บแยกจาก app)

**Q: ต้องการ Obsidian vault path อื่น**
- ไปที่ Settings → Brand Profile → แก้ไข Vault Path

**Q: รัน rag:index ได้ที่ไหน**
- เปิด Terminal แล้วรัน:
  ```bash
  open -a Terminal
  # จากนั้นใน Terminal:
  cd ~/Library/Application\ Support/Law\ AI\ Content\ OS
  ```

---

## ข้อมูลติดต่อ Support

ปัญหาที่แก้ไม่ได้ด้วย FAQ ด้านบน ติดต่อทีม dev ที่ตกลงกันไว้

---

*Law AI Content OS v1.0 | ข้อมูลทั้งหมดเก็บในเครื่องของคุณ ไม่มีการส่งออกสู่ภายนอก*
