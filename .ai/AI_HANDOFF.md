# DropWay AI Handoff

ไฟล์นี้คือจุดเริ่มต้นสำหรับ AI Agent ทุกตัวที่เข้ามาทำงานกับ DropWay
อ่านให้ครบก่อนแก้โค้ด แล้วค่อยลงลึกเฉพาะไฟล์ที่ task ต้องใช้

## Read First

1. `.ai/AI_RULES.md` — กฎที่ห้ามละเมิด
2. `.ai/CURRENT_STATE.md` — สถานะปัจจุบันของโปรเจกต์
3. `.ai/PROJECT_CONTEXT.md` — ภาพรวมโปรเจกต์
4. Task ที่กำลังทำ (`.ai/tasks/active/` ถ้ามี)
5. `.ai/ARCHITECTURE.md` / `.ai/WORKFLOW.md` — เมื่อ task ต้องใช้

## Quick Start (สำหรับ AI Agent ใหม่)

1. ตรวจ `git status`
2. ตรวจ branch ปัจจุบัน
3. ตรวจ latest commit SHA
4. อ่าน `.ai/AI_RULES.md`
5. อ่าน `.ai/CURRENT_STATE.md`
6. อ่าน `.ai/PROJECT_CONTEXT.md`
7. อ่าน task ที่เกี่ยวข้อง
8. inspect source files ที่ task ต้องใช้จริง
9. วางแผน (เขียน task brief ใน `.ai/tasks/` ถ้าเป็นงานใหญ่)
10. implement แบบ minimal changes
11. รัน `bun run lint`
12. รัน `bun run build`
13. review `git diff`
14. อัปเดต `.ai/CURRENT_STATE.md`
15. อัปเดต `.ai/AI_HANDOFF.md`
16. สรุปเป็น final report

เป้าหมาย: AI ไม่ต้องอ่านทั้ง repository ตั้งแต่ต้นทุกครั้ง

## Current Project Status

- Current Branch: `main`
- Current Commit: `ede06af` ขึ้นไป — งาน Phase 1 (`ab627da`) + เอกสาร `.ai/` (`ede06af`) commit และ push แล้ว
- Current Phase: **Phase 1 — UI/UX Design System & Visual Foundation (เสร็จ, verify แล้ว, push แล้ว)**
- Current Work: ไม่มีงานค้างในโค้ด — รอคำสั่งงานถัดไป (ห้ามเริ่ม Phase 2 เอง)
- Completed:
  - Design system (tokens, typography, spacing, radius, shadows) ใน `src/app/globals.css`
  - Shared UI components ครบชุดใน `src/components/ui/` (26 components + barrel)
  - Delivery Status System (10 สถานะ) แบบ UI-only
  - App Shell ใหม่: Desktop sidebar + topbar + mobile bottom navigation (`src/components/layout/AppShell.tsx`)
  - ปรับทุกหน้าให้ใช้ design system: `/`, `/login`, `/signup`, `/dashboard`, `/dashboard/houses`, `/dashboard/routes/navigate`
  - แก้ `eslint.config.mjs` ที่พัง (flat config) → lint รันได้แล้ว
  - แก้ `src/types/supabase.ts` จาก UTF-16 เป็น UTF-8 (เดิม ESLint อ่านไม่ได้)
- Known Issues: ดูรายการเต็มใน `.ai/CURRENT_STATE.md` (สรุป: `reported_houses`/`audits` ไม่อยู่ใน generated types, RLS ของตารางหลักยังต้องตรวจบน Supabase จริง, มี dead code ที่ยังไม่ลบ)
- Blocked: ไม่มี blocker ในระดับโค้ด — แต่ **runtime/preview ต้องใช้ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`** ซึ่งยังไม่มีใน workspace นี้ (ห้ามอ่าน/พิมพ์ค่า secret)
- Next Recommended Task: รอผู้ใช้สั่งงานถัดไป (Phase 2 หรือไม่ก็ได้ — ห้ามเริ่มเอง) — รายการงานที่มีข้อมูลรองรับอยู่ใน `.ai/CURRENT_STATE.md` หัวข้อ Next Recommended Tasks

## Important Files

| ไฟล์ | หน้าที่ |
|---|---|
| `src/app/globals.css` | Design tokens ทั้งหมดของ Phase 1 (สี, ฟอนต์, shadow, animation) |
| `src/components/ui/index.ts` | barrel ของ shared components — เช็คก่อนสร้าง component ใหม่ |
| `src/components/layout/AppShell.tsx` | navigation shell + auth state subscription + logout |
| `src/app/layout.tsx` | root layout: next/font, ToastProvider, AppShell, getUser() |
| `middleware.ts` | auth guard ของ `/dashboard/*` และเด้งคนล็อกอินออกจาก `/login`,`/signup` |
| `src/lib/supabase/client.ts` / `server.ts` | Supabase client (browser/server) |
| `src/app/dashboard/page.tsx` | dashboard (stats + activity + quick actions) |
| `src/app/dashboard/houses/page.tsx` | คลังบ้าน (CRUD, filter, CSV import/export) |
| `src/app/dashboard/routes/navigate/page.tsx` | หน้าส่งของหลัก (คิววันนี้, รายงานแล้ว, GPS, Vincenty sort) |
| `supabase/migrations/001_security_hardening.sql` | migration ล่าสุด (audits + note เรื่อง RLS) |
| `src/types/supabase.ts` | generated types ของ Supabase (ปัจจุบัน client ยังไม่ผูก generic) |

## Last Verification

วันที่ 2026-10-11 (หลังงาน Phase 1):

- `tsc --noEmit` → **PASS** (exit 0)
- `eslint .` → **PASS** (exit 0, ไม่มี error/warning)
- `next build` → **PASS** (exit 0, ทุก route เป็น dynamic `ƒ`)
- Runtime/preview → **ยังไม่ได้ verify**: workspace ไม่มี Supabase env keys
- รายละเอียดผลรัน+ข้อจำกัด: `.ai/reports/2026-10-11-phase-1-verification.md`

## Rules

AI ต้องไม่ถือว่าเอกสารนี้ถูกต้องกว่าซอร์สโค้ด

ถ้า source code / database / configuration กับเอกสารไม่ตรงกัน:

**SOURCE CODE / DATABASE / CONFIGURATION เป็น source of truth**

และต้องแก้ `CURRENT_STATE.md` / `AI_HANDOFF.md` ให้ตรงกับสถานะจริงหลังตรวจสอบ
