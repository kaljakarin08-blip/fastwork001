# Hermes — คู่มือติดตั้ง

> ระบบสร้าง content กฎหมาย/บัญชี อัตโนมัติ สำหรับ Facebook

---

## ข้อกำหนดเบื้องต้น

| รายการ | รายละเอียด |
|--------|-----------|
| ระบบปฏิบัติการ | macOS 12+ หรือ Windows 10/11 |
| RAM | ขั้นต่ำ 4 GB |
| พื้นที่ disk | ขั้นต่ำ 2 GB |
| Internet | ต้องการเชื่อมต่อ (สำหรับสร้าง content) |

---

## ขั้นตอนติดตั้ง (4 ขั้น)

### ขั้นที่ 1 — ดาวน์โหลดโปรแกรม

- **Mac:** เปิดไฟล์ `Hermes-[version].dmg` → ลาก Hermes ไปวางใน Applications
- **Windows:** เปิดไฟล์ `Hermes-Setup-[version].exe` → กด Next จนเสร็จ

### ขั้นที่ 2 — ตั้งค่าสำนักงาน

เปิดไฟล์ `hermes.config.ts` ด้วย Notepad หรือ TextEdit แก้ข้อมูลต่อไปนี้:

```
firm.name        → ชื่อสำนักงาน
firm.primaryColor → สีหลักของ brand (#RRGGBB)
domain           → 'law' หรือ 'accounting' หรือ 'both'
api.clientId     → รหัสที่ได้จาก Hermes team
api.clientSecret → รหัสลับที่ได้จาก Hermes team
```

### ขั้นที่ 3 — เพิ่มข้อมูลความรู้ (Vault)

วางไฟล์ `.txt` หรือ `.md` ลงในโฟลเดอร์:
- `vault/law/` — ข้อมูลกฎหมาย
- `vault/accounting/` — ข้อมูลบัญชี/ภาษี
- `vault/general/` — ข้อมูลสำนักงาน เช่น FAQ, profile

จากนั้นเปิดแอป → ไปที่ **Dashboard → Vault → กด Re-index**

### ขั้นที่ 4 — เริ่มใช้งาน

1. เปิดแอป Hermes
2. ไปที่ **Requirements → New** → สร้าง brief
3. ไปที่ **Queue → Process All** → รอระบบสร้าง content
4. ไปที่ **Outputs** → ดู/approve content → โพสต์

---

## โครงสร้างโฟลเดอร์

```
hermes-client/
├── hermes.config.ts     ← แก้ตรงนี้อย่างเดียว
├── vault/
│   ├── law/             ← วางเอกสารกฎหมาย
│   ├── accounting/      ← วางเอกสารบัญชี/ภาษี
│   └── general/         ← ข้อมูลสำนักงาน
├── data/
│   └── local.db         ← ฐานข้อมูล (อย่าลบ!)
└── rag/
    └── index.db         ← index ความรู้ (re-index ได้)
```

---

## คำถามที่พบบ่อย

**Q: ลืม clientId/clientSecret ทำยังไง?**  
A: ติดต่อ Hermes team

**Q: content ออกมาสั้นกว่าที่ต้องการ?**  
A: เพิ่มเอกสารใน vault/ ให้มากขึ้น แล้ว Re-index ใหม่

**Q: เพิ่มไฟล์ใน vault แล้วต้องทำอะไร?**  
A: Dashboard → Vault → Re-index (ใช้เวลา 1-2 นาที)

**Q: backup ข้อมูลได้ไหม?**  
A: copy โฟลเดอร์ `data/` ไปเก็บไว้

---

## ติดต่อ Support

Line: [Line ID]  
Email: [Email]  
เวลาทำการ: จ-ศ 9:00–18:00 น.
