# BACKLOG.md — Law Content OS Loop Tasks
**Updated:** 2026-06-27

---

## Phase 1: Demo Prep (priority — ทำก่อน demo ทนาย)

| # | Task | Priority | Status | Risk |
|---|------|----------|--------|------|
| B-01 | Fix hermes_model: gpt-5.4 → gpt-4o ใน app_settings | 🔴 HIGH | pending | LOW |
| B-02 | ลด New Requirement form → เลือกหมวด + Submit เท่านั้น | 🔴 HIGH | pending | LOW |
| B-03 | Brand Profile: ตั้งค่า default สำหรับ law firm | 🟡 MED | pending | LOW |
| B-04 | เพิ่ม Facebook Accounts page ใน Sidebar | 🟡 MED | pending | LOW |
| B-05 | compliance_note: แก้ให้ AI generate เสมอ (ไม่ null) | 🟡 MED | pending | MEDIUM — แตะ prompt |
| B-06 | RAG: เพิ่ม UI reminder "กด Re-index เมื่อมีกฎหมายใหม่" | 🟢 LOW | pending | LOW |

## Phase 2: Architecture (หลัง validate demo)

| # | Task | Priority | Status | Risk |
|---|------|----------|--------|------|
| B-07 | Migrate SQLite → Supabase | 🔴 HIGH | blocked | HIGH — ต้อง Jakarin approve |
| B-08 | Deploy Dashboard → Vercel | 🔴 HIGH | blocked | HIGH |
| B-09 | Hermes Worker → Vercel Cron Job | 🔴 HIGH | blocked | HIGH |
| B-10 | Facebook OAuth multi-account (Vercel domain) | 🟡 MED | blocked | HIGH |
| B-11 | RAG auto re-index weekly schedule | 🟡 MED | blocked | MED |

---

## Blocked Reason
B-07 ถึง B-11: รอ demo validate + Jakarin approve architecture change
