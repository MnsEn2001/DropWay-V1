# DropWay AI Handoff

ไฟล์นี้คือจุดเริ่มต้นสำหรับ AI Agent ทุกตัวที่เข้ามาทำงานกับ DropWay
อ่านให้ครบก่อนแก้โค้ด แล้วค่อยลงลึกเฉพาะไฟล์ที่ task ต้องใช้

## Read First

1. `.ai/AI_RULES.md` — กฎที่ห้ามละเมิด (โดยเฉพาะ "GitHub Source of Truth")
2. `.ai/CURRENT_STATE.md` — สถานะปัจจุบันของโปรเจกต์
3. `.ai/PROJECT_CONTEXT.md` — ภาพรวมโปรเจกต์
4. Task ที่กำลังทำ (`.ai/tasks/active/` ถ้ามี)
5. `.ai/ARCHITECTURE.md` / `.ai/WORKFLOW.md` — เมื่อ task ต้องใช้

## Quick Start (สำหรับ AI Agent ใหม่)

1. ตรวจ GitHub latest SHA: `git fetch origin` + `git ls-remote origin refs/heads/main` (อย่าเชื่อ SHA ที่อยู่ในเอกสาร)
2. ตรวจ local HEAD, branch และ working tree: `git rev-parse HEAD`, `git branch --show-current`, `git status`
3. ประเมิน divergence: `git rev-list --left-right --count HEAD...origin/main` — ถ้าไม่ตรงกันหรือมีงานค้าง ให้ประเมินความปลอดภัยของ workspace ก่อนทำต่อ (ห้าม reset/force push/discard งานผู้ใช้)
4. อ่าน `.ai/AI_RULES.md`
5. อ่าน `.ai/CURRENT_STATE.md`
6. อ่าน `.ai/PROJECT_CONTEXT.md`
7. อ่าน task ที่เกี่ยวข้อง (`.ai/tasks/active/`)
8. อ่าน `.ai/ARCHITECTURE.md` / `.ai/WORKFLOW.md` เมื่อ task ต้องใช้
9. inspect source files ที่ task ต้องใช้จริง
10. วางแผน + implement แบบ minimal changes
11. รัน verification (`bun run lint`, `bun run build` — ขั้นตอนเต็มใน `.ai/WORKFLOW.md` PHASE 5)
12. review `git diff` — ห้ามมีไฟล์แปลกปลอม/secrets
13. อัปเดตเอกสารที่ได้รับผลกระทบ (CURRENT_STATE / HANDOFF / CHANGELOG / reports)
14. สรุป final report ตามหลักฐานจริง

เป้าหมาย: AI ไม่ต้องอ่านทั้ง repository ตั้งแต่ต้นทุกครั้ง

## Current Project Status (snapshot — ต้องตรวจซ้ำเสมอ)

ตรวจเมื่อ **2026-10-11** (ทุกค่ามาจากคำสั่ง git จริง — ไม่ใช่การคาดเดา):

- Branch: `main` — เป็น default branch ของ GitHub (`git ls-remote --symref origin HEAD`)
- GitHub `origin/main` (full SHA): `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97`
  — `docs(ai): record the Phase 1 commit SHAs in current state and handoff` (2026-10-11 07:54:40 +0000)
- Local HEAD (full SHA): `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97` — ตรงกับ origin/main
- Divergence: 0 ahead / 0 behind (`git rev-list --left-right --count HEAD...origin/main`)
- Working tree: มีการแก้ `.ai/*.md` จากงาน "AI Integrity & GitHub Source-of-Truth Hardening" ที่ยังไม่ commit (คำสั่งงานห้าม commit — ผู้ใช้ commit ผ่าน Changes panel) + `bun.lock` (untracked — repo ไม่ track lockfile)
- Current Phase: **Phase 1 — UI/UX Design System (เสร็จ, static checks ผ่าน, push แล้ว)**
- Current Work: งาน `.ai/` integrity hardening แก้เอกสารเสร็จ — รอผู้ใช้ commit
- Completed (สำคัญ):
  - Phase 1 UI foundation ทั้งหมด — commit `ab627da5ba65d677fce71c221af06bd0e82027e7`
  - ระบบเอกสาร `.ai/` + `.gitignore` + README — commits `ede06afc001165a131301df0bc6358bea829c522`, `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97`
  - กฎ GitHub Source of Truth + Quick Start ที่ตรวจ divergence ก่อนทำงาน (งาน hardening นี้)
- Known Issues: ดูรายการเต็มใน `.ai/CURRENT_STATE.md` (สรุป: `reported_houses`/`audits` ไม่อยู่ใน generated types, RLS ยังไม่ยืนยันบน Supabase จริง, มี dead code ที่ยังไม่ลบ)
- Blocked: runtime/preview ต้องใช้ `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` ที่ยังไม่มีใน workspace นี้ (ห้ามอ่าน/พิมพ์ค่า secret — ผู้ใช้จัดการผ่าน Settings → Environment)
- Next Recommended Task: ผู้ใช้ commit เอกสารชุดนี้ก่อน แล้วรอคำสั่งงานถัดไป (ห้ามเริ่ม Phase 2 เอง) — รายการงานที่ข้อมูลรองรับอยู่ใน `.ai/CURRENT_STATE.md`

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

- Static checks (รันจริง 2026-10-11): `bun run lint` + `bun run build` → **PASS**
  หลักฐาน: `.ai/reports/2026-10-11-phase-1-verification.md`
- งาน AI integrity hardening (เอกสารล้วน — 2026-10-11): รัน `bun run lint` + `bun run build` ซ้ำหลังแก้เอกสาร → **PASS** (exit 0 ทั้งคู่)
  หลักฐาน: `.ai/reports/2026-10-11-ai-integrity-audit.md`
- Runtime/preview: **NOT VERIFIED (BLOCKED)** — workspace ไม่มี Supabase env keys → ทุก route ตอบ 500 จาก `createSupabaseServerClient`
- อย่าอ้างผลเก่าเสมือนเพิ่งรัน — ตรวจวันที่ในรายงาน และ rerun เมื่อโค้ดเปลี่ยน

## Rules

AI ต้องไม่ถือว่าเอกสารนี้ถูกต้องกว่าซอร์สโค้ด / configuration / สถานะ Git จริง

ถ้า source code / database / configuration / GitHub กับเอกสารไม่ตรงกัน:

**SOURCE CODE / DATABASE / CONFIGURATION / GIT STATE เป็น source of truth**

และต้องแก้ `CURRENT_STATE.md` / `AI_HANDOFF.md` ให้ตรงกับสถานะจริงหลังตรวจสอบ
