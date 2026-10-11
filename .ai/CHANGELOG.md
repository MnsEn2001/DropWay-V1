# DropWay — AI Changelog

บันทึกเฉพาะ change ที่สำคัญต่อ project state (ไม่ลงรายละเอียดทุกไฟล์)

รูปแบบ:

```
## YYYY-MM-DD — ชื่องาน
- Task: <task id / ชื่อ>
- Changed: <สรุปสั้น>
- Why: <เหตุผล>
- Verification: <คำสั่ง + ผล>
- Commit: <full SHA หรือ "pending">
```

---

## 2026-10-11 — Phase 1: UI/UX Design System & Visual Foundation

- Task: Phase 1 (งาน UI/UX foundation ทั้งระบบ)
- Changed:
  - เพิ่ม design tokens + base styles ใน `src/app/globals.css` (light theme) และฟอนต์ Inter/Noto Sans Thai ผ่าน `next/font`
  - สร้าง shared UI components 26 ตัวใน `src/components/ui/` + barrel `index.ts` + Delivery Status System (UI-only)
  - เปลี่ยน navigation เป็น AppShell (sidebar + topbar + mobile bottom nav) แทน Navbar เดิม
  - ปรับทุกหน้า (landing, login, signup, dashboard, houses, navigate) ให้ใช้ design system + loading/empty/error states
  - เพิ่ม ToastProvider กลาง, Modal/Drawer/Dropdown/Tooltip/Tabs ใช้ร่วมกันทั้งแอป
  - ซ่อม `eslint.config.mjs` ที่พัง (flat config TypeError) และบังคับ `no-explicit-any: error`
  - แปลง `src/types/supabase.ts` เป็น UTF-8
  - ลบ `src/components/layout/Navbar.tsx` (แทนที่ด้วย `src/components/layout/AppShell.tsx`)
- Why: ยกระดับ UI/UX ให้เป็น production logistics platform โดยคง functionality / business logic / auth / database เดิมทั้งหมด
- Verification: `tsc --noEmit` PASS · `bun run lint` PASS · `bun run build` PASS (2026-10-11)
  รายละเอียด: `.ai/reports/2026-10-11-phase-1-verification.md`
- Commit: `ab627da5ba65d677fce71c221af06bd0e82027e7` — push ขึ้น `origin/main` แล้ว (2026-10-11)

## 2026-10-11 — Push งาน Phase 1 + ระบบ `.ai/` ขึ้น repository

- Task: git delivery (ผู้ใช้สั่ง push โดยตรง)
- Changed: commit 3 ก้อนบน `main` — `ab627da5…` (UI Phase 1), `ede06afc…` (ระบบ `.ai/` + `.gitignore` + README), `6f36c1b1…` (sync SHA ในเอกสาร) แล้ว push ขึ้น origin ช่วง `7b96d91d583cc7372672fe625527dba60d1dcce9..6f36c1b1c72f8abf9e290ae1dabcce02122b1b97`
- Why: เก็บงาน Phase 1 และเอกสาร AI workflow ขึ้น repository ตามคำสั่งผู้ใช้
- Verification: `git push origin main` exit 0 · `bun run lint` / `bun run build` PASS ก่อน commit
- Commit: `ede06afc001165a131301df0bc6358bea829c522` + `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97`
  · หมายเหตุ: `bun.lock` ที่ generate ใน workspace **ไม่ถูก commit** (repo ไม่ track lockfile)

## 2026-10-11 — .ai Integrity & GitHub Source-of-Truth Hardening

- Task: ตรวจ/ปรับเอกสาร AI ให้ยึด GitHub (`origin/main`) เป็น source of truth (เอกสารล้วน — ไม่แตะโค้ด)
- Changed:
  - `AI_RULES.md`: เพิ่มหัวข้อ "GitHub Source of Truth" (10 ข้อ) + ข้อ 10 ตารางหน้าที่เอกสาร + เกณฑ์ห้ามใช้ผลรันเก่าแทนการรันใหม่
  - `AI_HANDOFF.md`: Quick Start 14 ขั้น (เริ่มจากตรวจ GitHub SHA + divergence จริง) + สถานะ snapshot เป็น full SHA พร้อมวันที่
  - `CURRENT_STATE.md`: แยก GitHub `origin/main` vs local HEAD, แยก static checks / runtime (BLOCKED) / unverified ชัดเจน
  - `WORKFLOW.md`: PHASE 2 เพิ่มขั้นตรวจ GitHub + divergence; PHASE 7 บังคับบันทึก full SHA + วันที่ตรวจ
  - `PROJECT_CONTEXT.md`: แก้คำอ้างเรื่อง lockfile (repo ไม่ track `bun.lock`)
  - `ARCHITECTURE.md`: เพิ่ม `QuickAction` ในรายการ components + แก้ถ้อยคำ `.gitignore`
  - `reports/2026-10-11-phase-1-verification.md`: แก้สถานะ commit จาก "ยังไม่ commit" เป็น commit/push แล้ว
- Why: กัน AI ทำงานบน workspace ที่ล้าหลัง GitHub, กัน SHA/สถานะไม่ตรง และกันเอกสารทำให้เข้าใจผิด
- Verification: doc integrity (paths/secrets/.gitignore/divergence) ตรวจแล้วผ่าน · `bun run lint` PASS (exit 0) · `bun run build` PASS (exit 0)
  หลักฐาน: `.ai/reports/2026-10-11-ai-integrity-audit.md`
- Commit: pending — งานนี้ห้าม commit/push ตามคำสั่ง (ผู้ใช้ commit ผ่าน Changes panel)
