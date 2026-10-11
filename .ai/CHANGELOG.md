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
- Commit: pending (รอผู้ใช้ commit ผ่าน Changes panel)
