# DropWay — Current State

Snapshot ตรวจสอบเมื่อ: **2026-10-11** — ทุกค่ามาจาก repository + คำสั่ง git จริงที่รันในวันนี้ (ไม่ใช่การคาดเดา)
ถ้าจะใช้ไฟล์นี้เป็นหลักฐาน ให้ตรวจวันที่ในแต่ละส่วนก่อนเสมอ

## GitHub / Git status (หลักฐานจากงาน AI integrity hardening)

| รายการ | ค่า | วิธีตรวจ / วันที่ |
|---|---|---|
| Remote | `https://github.com/MnsEn2001/DropWay-V1.git` | `git remote -v` (2026-10-11) |
| Default branch | `main` | `git ls-remote --symref origin HEAD` (2026-10-11) |
| GitHub `origin/main` (full SHA) | `b8186f8702c0eb35fff457770196cfb3a8bae047` (task commit — เอกสารชุด sync นี้ถูก commit ต่อเป็น commit ถัดไป ดู `git log -1`) | `git ls-remote origin refs/heads/main` (2026-10-11) |
| GitHub commit ล่าสุด | `docs(ai): harden .ai docs with GitHub source-of-truth rules and verified SHAs` — 2026-10-11 | `git log -1 origin/main` |
| Local HEAD (full SHA) | `b8186f8702c0eb35fff457770196cfb3a8bae047` (branch `main`) | `git rev-parse HEAD` (2026-10-11) |
| Divergence local ↔ GitHub | **0 ahead / 0 behind** | `git rev-list --left-right --count HEAD...origin/main` (2026-10-11) |
| Working tree | สะอาด — เหลือเฉพาะ `bun.lock` (untracked; repo ไม่ track lockfile) | `git status` (หลัง push 2026-10-11) |

ประวัติ commit สำคัญ: `7b96d91d583cc7372672fe625527dba60d1dcce9` (Merge PR #1)
→ `ab627da5ba65d677fce71c221af06bd0e82027e7` (feat(ui): Phase 1)
→ `ede06afc001165a131301df0bc6358bea829c522` (ระบบ `.ai/` + `.gitignore` + README)
→ `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97` (sync SHA ในเอกสาร)
→ `b8186f8702c0eb35fff457770196cfb3a8bae047` (hardening เอกสาร `.ai/` + กฎ GitHub Source of Truth)

## Verification status (แยกประเภท — ห้ามนำมาใช้แทนกัน)

### Static checks — RUN

| Check | คำสั่งจริง | ผลล่าสุด | วันที่ |
|---|---|---|---|
| TypeScript | `./node_modules/.bin/tsc --noEmit` | PASS (exit 0) | 2026-10-11 |
| Lint | `bun run lint` | PASS (0 error, 0 warning) | 2026-10-11 |
| Build | `bun run build` | PASS (ทุก route dynamic `ƒ`) | 2026-10-11 |

หมายเหตุ: ผลชุดนี้เป็นการรันจริงในงาน Phase 1 — และรันซ้ำอีกครั้งหลังงาน AI integrity hardening (เอกสารล้วน) เมื่อ 2026-10-11: `bun run lint` PASS (exit 0) · `bun run build` PASS (exit 0)
หลักฐาน: `.ai/reports/2026-10-11-phase-1-verification.md`, `.ai/reports/2026-10-11-ai-integrity-audit.md`
งานเอกสารไม่เปลี่ยนโค้ดจึงไม่กระทบผล — แต่ถ้าแก้โค้ดต้องรันใหม่และอัปเดตช่องนี้

### Runtime / preview — **BLOCKED (NOT VERIFIED)**

- เปิด dev server ผ่าน managed preview ได้ แต่ทุก route ตอบ **500** จาก
  `Your project's URL and Key are required to create a Supabase client!` (throw ที่ `src/lib/supabase/server.ts`)
- สาเหตุ: workspace ไม่มี `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **build ผ่าน ≠ runtime ผ่าน** — ยังไม่เคย render จริงในเบราว์เซอร์
- เมื่อผู้ใช้ใส่คีย์แล้ว: `freebuff-preview restart` แล้ว re-verify (ดู `.ai/reports/2026-10-11-phase-1-verification.md`)

### ยังไม่ได้ตรวจ (unverified)

- RLS ของตารางหลัก (`houses`, `pending_houses`, `today_houses`, `start_positions`) บน Supabase project จริง
- RPC ทั้งหมด (`refresh_and_merge_today_houses`, `save/get/clear_start_position`, `load_pending_to_today`)
- Responsive ด้วย viewport จริง (ตรวจเชิงโครงสร้างโค้ดเท่านั้น)
- ไม่มี test framework ในโปรเจกต์ — verification อาศัย lint/build + manual

## Current phase

- Phase 1 (UI/UX foundation) — **เสร็จ + push** (static checks ผ่าน; runtime ยัง BLOCKED)
- Phase 2 — ยังไม่เริ่ม (ห้ามเริ่มเอง รอคำสั่งผู้ใช้)

## Completed (verified — มีหลักฐาน)

- Phase 1 UI foundation: design tokens, shared UI components (26 components + barrel `index.ts`),
  Delivery Status System (UI-only 10 สถานะ), AppShell (sidebar/topbar/bottom nav),
  ปรับทุกหน้า + loading/empty/error states — commit `ab627da5ba65d677fce71c221af06bd0e82027e7`
- ระบบเอกสาร `.ai/` + `.gitignore` + README — commits `ede06afc001165a131301df0bc6358bea829c522`, `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97`
- งาน AI integrity hardening: กฎ GitHub Source of Truth, Quick Start ที่ตรวจ divergence,
  แยก GitHub/local SHA, แก้ SHA/สถานะที่ไม่ตรง — commit `b8186f8702c0eb35fff457770196cfb3a8bae047` — push ขึ้น `origin/main` แล้ว (2026-10-11)
- Functional เดิม (ยังทำงาน — มีมาก่อน Phase 1): Auth (Supabase email/password + middleware guard),
  Dashboard stats/activity, คลังบ้าน (CRUD/ค้นหา/กรอง/CSV/pagination), นำทางส่งของ
  (Vincenty + cluster + รายงานปัญหา + งานค้าง)

## In-progress

- ไม่มีงานค้าง — งาน hardening commit + push แล้ว (เอกสาร sync ชุดนี้ตามด้วย commit ถัดไป)

## Known issues (มีหลักฐานประกอบ)

1. `reported_houses` และ `audits` ถูกเรียกใช้ในโค้ด แต่ไม่มีใน generated types (`src/types/supabase.ts`)
   — client ไม่ผูก generic จึงยังทำงานได้ แต่ควร regenerate types จาก Supabase จริง
2. RLS ของตารางหลักยังไม่ถูกยืนยันบน Supabase จริง — `001_security_hardening.sql` มีแค่ตาราง `audits` + policy ของ audits
3. `houses` เป็นตารางกลางที่ผู้ใช้ล็อกอินคนใดก็แก้/ลบได้ — ยืนยันก่อนว่าเป็นเจตนาของ product
4. Dead code ยังอยู่ (ไม่ถูกลบ): `src/lib/distance.ts`, `src/components/routes/NavigationButton.tsx`,
   dependency `tesseract.js` + `src/types/tesseract.d.ts`
5. หน้า houses โหลด `houses` ทั้งตารางมา filter บน client — เหมาะกับสเกลปัจจุบัน (~1.3k แถว) แต่ควรจับตาเมื่อโตขึ้น
6. การลบข้อมูลยังใช้ `confirm()` ของเบราว์เซอร์ และบาง action ใช้ `window.location.reload()` (native UX)
7. `freebuff-preview` ต้องมี Supabase env keys ก่อนจึงจะรันได้

## Blockers

- Runtime verification: **BLOCKED** — workspace ไม่มี `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (ห้ามอ่าน/พิมพ์ค่า secret — ผู้ใช้จัดการผ่าน Settings → Environment)
- ไม่มี blocker ด้านโค้ด: static checks ผ่าน

## Technical debt

- Supabase client ไม่ผูก generic `Database` → query ไม่มี compile-time safety กับ schema
- Business logic หนักอยู่ใน client components (houses/navigate ไฟล์ใหญ่) — ควรพิจารณาแยก hooks/services ในอนาคต
- ไม่มี test framework — verification อาศัย lint/build + manual
- `src/types/supabase.ts` ต้องคงเป็น UTF-8 (ถ้า regenerate ต้องเช็ค encoding ก่อน commit)

## Important warnings

- ห้ามแก้ authentication flow / Supabase logic / database schema โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรใน task
- ห้ามลบ route/feature ที่ยังใช้งานอยู่
- ห้ามใส่ fake data / fake statistics ในทุกหน้า
- ห้าม commit secrets; `.ai/` ต้องไม่เก็บ credential ใด ๆ
- `.ai/` ต้องไม่ถูกเพิ่มใน `.gitignore`
- ห้ามรายงานว่า "production ready" — ยังไม่มีหลักฐาน runtime

## Next Recommended Tasks (ยังไม่เริ่ม — รอคำสั่งผู้ใช้)

1. ผู้ใช้ commit เอกสาร hardening ชุดนี้ (Changes panel)
2. Regenerate Supabase types + เติม `reported_houses`/`audits`
3. ทบทวน RLS บน Supabase project จริง
4. ใส่ Supabase env keys แล้ว re-verify runtime (`freebuff-preview restart`)
5. ล้าง dead code (distance.ts, NavigationButton.tsx, tesseract.js) เมื่อได้รับอนุญาต
