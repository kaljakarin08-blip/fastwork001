# LOOP.md — Law Content OS
**Version:** 1.0 | **Project:** law-content-v2 | **Owner:** Jakarin

---

## Loop Level: L2 — Read + Fix

AI สามารถ: อ่านโค้ด → วิเคราะห์ → แก้ไขโค้ด → self-test → update state
AI ต้องหยุดรอ: migration, FB credentials, worker core logic, deploy

---

## Workflow (ทุก Loop)

```
1. READ     → อ่าน LOOP_STATE.md → รู้ว่าอยู่ตรงไหน
2. PICK     → เลือก task แรกใน BACKLOG ที่ status=pending
3. PLAN     → วิเคราะห์ files ที่เกี่ยวข้อง ≤3 นาที
4. EXECUTE  → แก้ไขโค้ด (เฉพาะ scope ที่อนุญาต)
5. TEST     → รัน test gate ที่กำหนด
6. LOG      → update LOOP_STATE.md + BACKLOG.md
7. ESCALATE → ถ้าเจอ risk → หยุด → แจ้ง Jakarin
8. REPEAT   → loop ถัดไปทันทีถ้าไม่มี escalation
```

---

## Rules

### ✅ อนุญาต
- Read ทุกไฟล์ใน project
- แก้ไข UI components, pages, API routes
- แก้ไข styles, copy, labels
- update app_settings ผ่าน API (ไม่แตะ DB โดยตรง)
- สร้างไฟล์ใหม่ (component, util, type)
- update LOOP_STATE.md, BACKLOG.md

### ❌ ห้ามเด็ดขาด
- แตะ hermes/worker.ts (core pipeline)
- รัน DB migration โดยไม่ approve
- ลบไฟล์ใดๆ
- แก้ FB token / API credentials โดยตรง
- Deploy หรือ push ใดๆ
- Broad refactor นอก scope task

### 🔴 Escalate ทันที
- พบ bug ที่กระทบ content ที่ส่งหา FB แล้ว
- พบ logic ผิดใน worker pipeline
- ต้องเปลี่ยน DB schema
- ไม่แน่ใจ scope มากกว่า 20%

---

## Test Gate (ทุก task)

```bash
npm run build        # ต้อง pass
npm run typecheck    # ต้อง pass
npm run lint         # 0 errors
```

ถ้า fail → rollback → log → escalate

---

## State Files

| ไฟล์ | หน้าที่ |
|------|---------|
| `orchestration/LOOP_STATE.md` | loop ปัจจุบัน, task กำลังทำ, last result |
| `orchestration/BACKLOG.md` | task queue ทั้งหมด พร้อม priority + status |
| `orchestration/RISK_LOG.md` | escalation history |

---

## Loop Output Format

```
LOOP #[N] — [TASK NAME]
Status: PASS | FAIL | ESCALATE
Files changed: [list]
Test gate: PASS | FAIL
Risk: NONE | [description]
Next: [next task]
```
