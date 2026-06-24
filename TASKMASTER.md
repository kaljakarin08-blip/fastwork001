# TASKMASTER — Law AI Content OS (law-content-v2)
> PM: Claude Code | Executor: Codex | Updated: 2026-06-22

---

## Sprint: Electron Desktop App Packaging

**Goal:** Package Next.js + Hermes worker เป็น `.dmg` (Mac) ที่ client ติดตั้งและใช้งานได้โดยไม่ต้องมี Node.js หรือ terminal

**Architecture Target:**
```
Electron main process
  ├── spawn → Next.js server (standalone build, port 3000)
  ├── spawn → Hermes worker (compiled JS bundle)
  └── BrowserWindow → http://localhost:3000

DB: app.getPath('userData')/data/local.db
Migrations: bundled ใน app resources
OpenAI Key: stored ใน DB (app_settings) ไม่ใช่ .env
```

**Critical Risks:**
- `better-sqlite3` เป็น native addon ต้อง rebuild สำหรับ Electron ABI
- `process.cwd()` ใช้ใน DB + migration path ต้องแก้ทั้งหมด ก่อน Electron จะทำงานได้
- Next.js 16.2.9 standalone output ยังใหม่มาก ต้องทดสอบก่อน phase ถัดไป

---

## Phase 1 — Foundation & Validation

> ทดสอบก่อนว่า standalone build + SQLite rebuild ทำงานได้

### T-101 · Next.js standalone output
**Status:** ✅ DONE — `output: 'standalone'` added, `pnpm build` passes, `.next/standalone/server.js` + `better-sqlite3` present
**Files:** `next.config.ts`
**Tasks:**
- เพิ่ม `output: 'standalone'` ใน nextConfig
- รัน `pnpm build` → verify ไม่ error
- ตรวจว่า `.next/standalone/` มี `server.js` + node_modules ครบ
- ตรวจว่า `better-sqlite3` อยู่ใน standalone output
**Accept:** `pnpm build` pass, `.next/standalone/server.js` มีอยู่

---

### T-102 · Install Electron + build tools
**Status:** ✅ DONE — electron@36, electron-builder, esbuild, concurrently, wait-on installed
**Files:** `package.json`, `pnpm-lock.yaml`
**Tasks:**
- เพิ่ม devDependencies:
  - `electron` (latest stable)
  - `electron-builder`
  - `@electron/rebuild`
  - `concurrently`
- เพิ่ม devDependencies TypeScript:
  - `@types/electron` (หรือ electron types ที่มากับ package)
- รัน `pnpm install`
**Accept:** `node_modules/electron` มีอยู่, `electron --version` ได้ output

---

### T-103 · Rebuild better-sqlite3 สำหรับ Electron ABI ⚠️ Critical
**Status:** ✅ DONE — `npx @electron/rebuild -f -w better-sqlite3` → "Rebuild Complete". electron-builder.yml: `npmRebuild: true` + `asarUnpack: ["**/*.node"]` handles auto-rebuild on package
**Files:** `package.json` (scripts), `.npmrc` หรือ `electron-builder.yml`
**Tasks:**
- เพิ่ม script: `"electron:rebuild": "electron-rebuild -f -w better-sqlite3"`
- รัน rebuild → ตรวจว่าไม่ error
- ทดสอบ import `better-sqlite3` ใน Electron main process (script เล็กๆ)
- ตั้ง `electron-builder` ให้ rebuild native modules อัตโนมัติ (`npmRebuild: true`)
**Accept:** `require('better-sqlite3')` ทำงานได้ใน Electron environment
**Escalate ถ้า:** rebuild error หลังลอง 2 ครั้ง — PM ต้อง investigate Electron version compatibility

---

### T-104 · Fix path dependencies (process.cwd → resource paths)
**Status:** ✅ DONE — `lib/local-db/client.ts` มี `LOCAL_DB_PATH` อยู่แล้ว; เพิ่ม `MIGRATIONS_DIR` env var support แล้ว; RAG vault path มาจาก DB
**Files:** `lib/local-db/client.ts`, `lib/local-db/migrations/` (path reference)
**Tasks:**
- `lib/local-db/client.ts`: เปลี่ยน DB_PATH fallback จาก `process.cwd()/data/local.db` ให้รองรับ env var `LOCAL_DB_PATH` (อยู่แล้ว ✅) — ตรวจว่า Electron จะ set env var นี้ได้
- Migration dir: เปลี่ยนจาก `path.join(process.cwd(), 'lib/local-db/migrations')` → รองรับ `MIGRATIONS_DIR` env var ด้วย
- RAG index path: ตรวจว่า Obsidian vault path มาจาก env var หรือ DB ไม่ใช่ hardcode
**Accept:** `LOCAL_DB_PATH` และ `MIGRATIONS_DIR` override ได้จาก env — ไม่มี `process.cwd()` hardcode ในส่วน paths ที่สำคัญ

---

## Phase 2 — Electron Main Process

> สร้าง shell ที่ spawn Next.js + Hermes แล้วเปิด BrowserWindow

### T-201 · Create electron/main.ts
**Status:** ✅ DONE — `electron/main.ts` + `electron/tsconfig.json` สร้างแล้ว, typecheck pass, `electron-dist/main.js` compile OK
**Files:** `electron/main.ts` (new), `electron/tsconfig.json` (new)
**Tasks:**
- สร้าง main process:
  ```
  app.on('ready') → 
    1. set env vars (LOCAL_DB_PATH, MIGRATIONS_DIR → userData)
    2. spawnNextServer()
    3. spawnHermesWorker()
    4. waitForNextReady() → createWindow()
  ```
- `createWindow()`: BrowserWindow 1280×800, `http://localhost:3000`
- `app.on('window-all-closed')` → quit + kill child processes
- สร้าง `electron/tsconfig.json` target CommonJS สำหรับ main process
**Accept:** `npx electron electron/main.js` เปิด window แสดง Next.js app

---

### T-202 · Next.js server spawn + health check
**Status:** ✅ DONE — `spawnNextServer()` + `waitForNextReady()` ใน main.ts; `app/api/health/route.ts` สร้างแล้ว; splash screen ระหว่างรอ boot
**Files:** `electron/main.ts`
**Tasks:**
- `spawnNextServer()`: spawn `.next/standalone/server.js` ด้วย `child_process.spawn`
  - set env: `PORT=3000`, `LOCAL_DB_PATH`, `MIGRATIONS_DIR`, `NODE_ENV=production`
  - pipe stdout/stderr → electron log
- `waitForNextReady()`: poll `http://localhost:3000/api/health` ทุก 500ms max 30s
  - ถ้าไม่ ready ใน 30s → แสดง error dialog
- สร้าง health endpoint: `app/api/health/route.ts` → `{ ok: true }`
- ระหว่างรอ: แสดง loading window หรือ splash screen
**Accept:** Next.js boot ได้ใน Electron, window เปิด app ถูกต้อง

---

### T-203 · Hermes worker spawn
**Status:** ✅ DONE — `spawnHermesWorker()` + auto-restart (max 3x) ใน main.ts; `hermes:build` esbuild script → `dist/hermes.js` 376KB
**Files:** `electron/main.ts`, `hermes/worker.ts`
**Tasks:**
- Compile Hermes worker เป็น standalone JS ก่อน package:
  - เพิ่ม script `"hermes:build": "esbuild hermes/worker.ts --bundle --platform=node --outfile=dist/hermes.js --external:better-sqlite3"`
  - หรือใช้ `ncc` bundler แทน
- `spawnHermesWorker()`: spawn `dist/hermes.js` ด้วย `child_process.fork` หรือ `spawn`
  - set env: `HERMES_APP_URL=http://localhost:3000`, `OPENAI_API_KEY` (อ่านจาก DB ผ่าน app_settings)
  - restart อัตโนมัติถ้า crash (max 3 ครั้ง)
- แสดง Hermes status (running/stopped) ใน UI ได้จาก IPC หรือ health API
**Accept:** Hermes spawn ได้ใน Electron, logs ปรากฏใน electron console

---

### T-204 · OpenAI key จาก DB แทน .env
**Status:** ✅ DONE — `getOpenAIKeyFromDb()` อ่าน SQLite โดยตรงใน main process แล้ว set `OPENAI_API_KEY` env var ให้ Hermes subprocess ก่อน spawn
**Files:** `electron/main.ts`, `lib/local-db/client.ts`
**Tasks:**
- ใน Electron main: ก่อน spawn Hermes อ่าน `openai_api_key` จาก SQLite โดยตรง (ไม่ผ่าน API)
- set `OPENAI_API_KEY` env var ให้ Hermes subprocess
- ถ้า key ว่าง: spawn Hermes ต่อ (Hermes จะ fail gracefully ต่อ job)
- ไม่ต้องสร้าง `.env.local` — user กรอก key ผ่าน Settings → API Keys ใน UI
**Accept:** Hermes ได้รับ OpenAI key จาก DB ผ่าน env var โดยอัตโนมัติ

---

## Phase 3 — Build Pipeline & Packaging

### T-301 · electron-builder config
**Status:** ✅ DONE — `electron-builder.yml` สร้างแล้ว: Mac DMG, x64+arm64, asarUnpack better-sqlite3, npmRebuild: true
**Files:** `electron-builder.yml` (new)
**Tasks:**
- สร้าง `electron-builder.yml`:
  ```yaml
  appId: com.lawfirm.aicos
  productName: Law AI Content OS
  directories:
    output: dist-electron
  files:
    - .next/standalone/**
    - .next/static/**
    - dist/hermes.js
    - lib/local-db/migrations/**
    - public/**
    - electron/main.js
  mac:
    target: dmg
    icon: public/app-icon.icns
  npmRebuild: true
  ```
- ทดสอบ `pnpm dist:mac` → ได้ `.dmg` ไฟล์
**Accept:** `.dmg` สร้างได้ ขนาดสมเหตุสมผล (<300MB)

---

### T-302 · Build scripts
**Status:** ✅ DONE — `electron:compile`, `hermes:build`, `build:electron`, `dist:mac`, `electron:dev` scripts ใน package.json
**Files:** `package.json`
**Tasks:**
- เพิ่ม scripts:
  ```json
  "electron:compile": "tsc -p electron/tsconfig.json",
  "hermes:build": "esbuild hermes/worker.ts --bundle --platform=node --outfile=dist/hermes.js --external:better-sqlite3",
  "build:electron": "next build && pnpm hermes:build && pnpm electron:compile",
  "dist:mac": "pnpm build:electron && electron-builder --mac",
  "electron:dev": "pnpm build && concurrently \"next start\" \"wait-on http://localhost:3000 && electron .\""
  ```
- ทดสอบ `pnpm electron:dev` → Electron เปิด Next.js app ได้
**Accept:** `pnpm electron:dev` ใช้ dev mode ได้, `pnpm dist:mac` สร้าง DMG

---

### T-303 · App icon + branding
**Status:** ✅ DONE — `public/app-icon.icns` (150KB), `app-icon.png` (1024px), `app-icon-tray.png` (32px) — scales of justice, navy/gold
**Files:** `public/app-icon.icns`, `public/app-icon.png`
**Tasks:**
- สร้าง icon 1024×1024 (Navy bg + "L" gold เหมือน sidebar brand)
- Convert เป็น `.icns` (Mac) ด้วย `iconutil` หรือ online converter
- ใส่ใน `electron-builder.yml`
**Accept:** DMG แสดง icon ถูกต้อง, dock icon ถูกต้อง

---

## Phase 4 — UX & Polish

### T-401 · Loading / splash screen
**Status:** ✅ DONE — `electron/splash.html` navy/gold brand design, 3-dot animation, ปิดอัตโนมัติเมื่อ Next.js ready
**Files:** `electron/main.ts`, `electron/splash.html` (new)
**Tasks:**
- แสดง splash window ระหว่าง Next.js boot (ประมาณ 3-8 วินาที)
- Splash แสดง: Logo + "กำลังเริ่มต้นระบบ..." + progress dots animation
- ปิด splash แล้วเปิด main window เมื่อ Next.js ready
**Accept:** ไม่มี blank window ระหว่างรอ, transition smooth

---

### T-402 · System tray
**Status:** ✅ DONE — `createTray()` ใน main.ts: เปิด/restore window, Hermes status, Quit, app ยังรันใน tray เมื่อปิด window
**Files:** `electron/main.ts`
**Tasks:**
- เพิ่ม Tray icon ใน menubar
- Menu items:
  - "เปิด Law AI OS" → focus/restore window
  - "Hermes: Running ●" (status)
  - separator
  - "Quit"
- ปิด window แล้ว app ยังทำงานใน tray ได้ (Hermes ยังรัน)
**Accept:** App อยู่ใน tray ได้ ไม่ต้อง quit เมื่อปิด window

---

### T-403 · First-run setup wizard (optional — ถ้า time allows)
**Status:** ✅ DONE — `app/dashboard/setup/page.tsx` — 4 steps: welcome → API key + test → brand name → done; auto-redirect ถ้าไม่มี key
**Files:** `app/dashboard/setup/page.tsx` (new)
**Tasks:**
- ถ้าไม่มี OpenAI key ใน DB → redirect ไป `/dashboard/setup`
- Setup page: กรอก API key → test → next
- เสร็จแล้ว redirect ไป dashboard
**Accept:** User ใหม่รู้ว่าต้องทำอะไรก่อนใช้งาน

---

## Phase 5 — Testing & Handoff

### T-501 · Smoke test บน fresh machine
**Status:** ⏳ READY — DMG สร้างสำเร็จ รอ user ทดสอบบนเครื่อง fresh
**Tasks:**
- ติดตั้ง `.dmg` บนเครื่องที่ไม่มี Node.js / pnpm
- ทดสอบ:
  - [ ] เปิด app ได้
  - [ ] กรอก OpenAI key ใน Settings → บันทึกได้
  - [ ] สร้าง Requirement → Submit → Hermes process → output ปรากฏ
  - [ ] RAG search ทำงาน (ถ้า vault indexed แล้ว)
  - [ ] ปิด app → reopen → ข้อมูลยังอยู่ (DB persist)
**Accept:** ผ่านทุก checklist บนเครื่องที่ไม่มี dev tools

---

### T-502 · Client onboarding doc (1 หน้า)
**Status:** ✅ DONE — `docs/CLIENT_GUIDE.md` — ติดตั้ง, setup wizard, RAG index, system tray, FAQ
**Files:** `docs/CLIENT_GUIDE.md` (new)
**Tasks:**
- ขั้นตอน: ติดตั้ง DMG → กรอก OpenAI key → วาง Obsidian vault → รัน pnpm rag:index (ครั้งแรก) → ใช้งาน
- Screenshot แต่ละขั้นตอน
- FAQ: "Hermes ไม่ทำงาน", "ข้อมูลหาย", "อัพเดต app"
**Accept:** client อ่านแล้วใช้งานได้เองใน 15 นาที

---

## Dependency Map

```
T-101 ──┬──> T-201 ──> T-202 ──> T-301 ──> T-302 ──> T-501
T-102 ──┤         └──> T-203 ──┘              └──> T-303
T-103 ──┤              └──> T-204
T-104 ──┘
         T-201 ──> T-401
                └──> T-402
```

**Must complete in order (blockers):**
1. T-103 (SQLite rebuild) — ถ้า fail ทุกอย่างหยุด
2. T-101 (standalone build) — ต้องผ่านก่อน T-201
3. T-202 (Next.js spawn) — ต้องผ่านก่อน T-301

---

## Status Summary

| Phase | Tasks | Done | Remaining |
|-------|-------|------|-----------|
| 1 Foundation | 4 | 4 ✅ | — |
| 2 Main Process | 4 | 4 ✅ | — |
| 3 Build Pipeline | 3 | 3 ✅ | — |
| 4 UX Polish | 3 | 3 ✅ | — |
| 5 Handoff | 2 | 1 ✅ | T-501 (smoke test — user) |
| **Total** | **16** | **15** | **1** |

---

## PM Notes

- **Phase 1 คือ gate** — ถ้า T-103 (SQLite rebuild) fail ต้อง escalate ก่อนดำเนินการต่อ
- **T-104 สำคัญมาก** — `process.cwd()` bug จะทำให้ DB/migrations หาไม่เจอใน packaged app
- **Obsidian vault** ยังต้อง index ด้วย `pnpm rag:index` ครั้งแรก — client ต้องได้รับคำแนะนำ
- **Auto-update** (T5xx) ไม่อยู่ใน scope นี้ — ถ้าต้องการเพิ่มทีหลังใช้ `electron-updater`
- **Windows** ไม่อยู่ใน scope — Mac first, Windows ถ้า client ต้องการ
