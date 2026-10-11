# DropWay — AI Changelog

บันทึกเฉพาะ change ที่สำคัญต่อ project state (ไม่ลงรายละเอียดทุกไฟล์)

รูปแบบ:

```
## YYYY-MM-DD — ชื่องาน
- Task: <task id / ชื่อ>
- Changed: <สรุปสั้น>
- Why: <เหตุผล>
- Verification: <คำสั่ง + ผล>
- Commit: <SHA หรือ "pending">
```

---

## 2026-10-11 — Phase 1: UI/UX Design System & Visual Foundation

- Task: Phase 1 (งาน UI/UX foundation ทั้งระบบ)
- Changed:
  - เพิ่ม design tokens + base styles ใน `src/app/globals.css` (light theme) และฟอนต์ Inter/Noto Sans Thai ผ่าน `next/font`
  - สร้าง shared UI components 26 ไฟล์ใน `src/components/ui/` + Delivery Status System (UI-only)
  - เปลี่ยน navigation เป็น AppShell (sidebar + topbar + mobile bottom nav) แทน Navbar เดิม
  - ปรับทุกหน้า (landing, login, signup, dashboard, houses, navigate) ให้ใช้ design system + loading/empty/error states
  - เพิ่ม ToastProvider กลาง, Modal/Drawer/Dropdown/Tooltip/Tabs ใช้ร่วมกันทั้งแอป
  - ซ่อม `eslint.config.mjs` ที่พัง (flat config TypeError) และบังคับ `no-explicit-any: error`
  - แปลง `src/types/supabase.ts` เป็น UTF-8
  - ลบ `src/components/layout/Navbar.tsx` (แทนที่ด้วย `src/components/layout/AppShell.tsx`)
- Why: ยกระดับ UI/UX ให้เป็น production logistics platform โดยคง functionality/ business logic / auth / database เดิมทั้งหมด
- Verification: `tsc --noEmit` PASS · `bun run lint` PASS · `bun run build` PASS (2026-10-11)
  รายละเอียดเพิ่มเติม: `.ai/reports/2026-10-11-phase-1-verification.md`
- Commit: `ab627da` (feat(ui)) — push ขึ้น `origin/main` แล้ว

## 2026-10-11 — Push งาน Phase 1 + ระบบ `.ai/` ขึ้น repository

- Task: git delivery (ผู้ใช้สั่ง push โดยตรง)
- Changed: แยก commit เป็น 2 ก้อน — `ab627da` (UI Phase 1) และ `ede06af` (เอกสาร `.ai/` + `.gitignore` + README)
  แล้ว push `main` ขึ้น origin (`7b96d91..ede06af`); ตามด้วย commit เล็กที่อัปเดต CURRENT_STATE/HANDOFF/CHANGELOG ให้ตรง SHA จริง
- Why: เก็บงาน Phase 1 และเอกสาร AI workflow ขึ้น repository ตามคำสั่งผู้ใช้
- Verification: `git push origin main` exit 0 (`7b96d91..ede06af`) · tsc/lint/build PASS ก่อน commit
- Commit: `ede06af` (+ docs-update commit ถัดจากนั้น) · หมายเหตุ: `bun.lock` ที่ generate ใน workspace **ไม่ถูก commit** (repo ไม่เคย track lockfile)
