# DropWay — Current State

Snapshot ล่าสุด: **2026-10-11** (หลังงาน Phase 1 — UI/UX Design System & Visual Foundation)
ทุกอย่างในไฟล์นี้อ้างจาก repository จริง ณ วัน/เวลาข้างต้น

## Repository

- Remote: `https://github.com/MnsEn2001/DropWay-V1.git`
- Branch: `main`
- Commit SHA ล่าสุด ณ ตอนบันทึก: `ede06af` — ต่อจาก `ab627da` (feat(ui): Phase 1) บน base เดิม `7b96d91`
- งาน Phase 1 + ระบบ `.ai/` **commit และ push ขึ้น `origin/main` แล้ว** เมื่อ 2026-10-11 (`7b96d91..ede06af`)
- หมายเหตุ: ไฟล์นี้ถูกอัปเดตต่ออีก commit ถัดจาก `ede06af` — ดู SHA จริงล่าสุดด้วย `git log -1 --oneline`

## Verification status

| Check | ผล | วันที่ |
|---|---|---|
| `tsc --noEmit` | PASS | 2026-10-11 |
| `bun run lint` (eslint) | PASS (0 error, 0 warning) | 2026-10-11 |
| `bun run build` (next build) | PASS (ทุก route = dynamic) | 2026-10-11 |
| Runtime / preview | เปิด preview ได้ แต่ทุก route ตอบ **500** จาก `createSupabaseServerClient` (ไม่มี `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน workspace) → **verify ไม่ได้** | 2026-10-11 |

## Current phase

Phase 1 (UI/UX foundation) — **เสร็จ + verify ผ่าน**
Phase 2 — ยังไม่เริ่ม (ห้ามเริ่มเอง รอคำสั่งผู้ใช้)

## Completed features (functional)

- Auth ด้วย Supabase: `/login`, `/signup` (มี resend confirmation), guard ด้วย `middleware.ts`
- Dashboard: บ้านทั้งหมด, งานวันนี้, งานค้าง, % บ้านที่มีพิกัด, tip อัตโนมัติ, กิจกรรมล่าสุด
- คลังบ้าน: เพิ่ม/แก้/ลบ, ค้นหาทุกฟิลด์, ตัวกรองหลายชั้น, จัดกลุ่ม, แบ่งหน้า 20/หน้า,
  คัดลอกเบอร์, ตรวจจับ GPS, ฟอร์มที่อยู่แบบ dropdown 3 ชั้น (ม.→ต.→บ.), นำเข้า/ส่งออก CSV, เพิ่มเข้าคิววันนี้
- นำทางส่งของ: คิววันนี้/รายงานแล้ว, เรียงด้วย Vincenty จากจุดเริ่มต้น (GPS/ตั้งเอง/บันทึกผ่าน RPC),
  จัดคลัสเตอร์บ้านใกล้กัน, เปิดเส้นทางรวม ≤20 จุด, นำทางทีละหลัง, ส่งแล้ว, รายงานปัญหา 6 เหตุผล,
  ดึงงานค้าง, สำรอง/กู้จุดเริ่มต้นผ่าน localStorage + RPC

## Completed in Phase 1 (UI foundation)

- Design tokens (สี/ฟอนต์/elevation) + base styles ใน `src/app/globals.css` (light theme เท่านั้น)
- Shared UI components ใน `src/components/ui/`: 26 component + barrel `index.ts` (รวม `QuickAction` สำหรับ quick action cards)
- Delivery Status System 10 สถานะ (UI-only) — `StatusBadge`, `StatusDot`, `StatusIcon`
- App Shell ใหม่: sidebar (desktop) + topbar + bottom navigation (mobile) + account drawer
- Toast system กลาง (`ToastProvider` + `useToast`) แทน toast แบบ DOM/local ของเดิม
- ปรับหน้า: landing, login, signup, dashboard, houses, navigate ให้ใช้ design system + states ครบ
  (loading/empty/error) และแก้ลิงก์เสีย `/dashboard/routes/upload` → `/dashboard/houses?tab=csv`
- ซ่อม `eslint.config.mjs` (flat config เดิมพัง TypeError) และตั้ง `no-explicit-any: error`
- แปลง `src/types/supabase.ts` จาก UTF-16 → UTF-8 (ESLint อ่านไม่ได้ก่อนหน้านี้)
- ลบ `src/components/layout/Navbar.tsx` (แทนที่ด้วย `AppShell.tsx`)

## In-progress features

- ไม่มี — รอ review/commit งาน Phase 1

## Known issues

1. `reported_houses` และ `audits` ถูกเรียกใช้ในโค้ด แต่ไม่มีใน generated types (`src/types/supabase.ts`)
   Client ไม่ได้ผูก generic `Database` จึงยังทำงานได้ — ควร regenerate types จาก Supabase จริง
2. RLS ของตารางหลัก (`houses`, `pending_houses`, `today_houses`, `start_positions`) ยังไม่ถูกยืนยันบน Supabase จริง
   migration `001_security_hardening.sql` มีแค่ตาราง `audits` + policy ของ audits (ตารางอื่นเป็น note/TODO)
3. `houses` เป็นตารางกลางที่ผู้ใช้ล็อกอินคนใดก็แก้/ลบได้ — ยืนยันก่อนว่าเป็นเจตนาของ product
4. Dead code ยังอยู่ (ไม่ถูกลบใน Phase 1): `src/lib/distance.ts`, `src/components/routes/NavigationButton.tsx`,
   dependency `tesseract.js` + `src/types/tesseract.d.ts`
5. หน้า houses โหลด `houses` ทั้งตารางมา filter บน client — เหมาะกับสเกลปัจจุบัน (~1.3k แถว) แต่ควรจับตาเมื่อโตขึ้น
6. การลบข้อมูลยังใช้ `confirm()` ของเบราว์เซอร์และบาง action ใช้ `window.location.reload()` (native UX)
7. `freebuff-preview` ต้องมี Supabase env keys ก่อนจึงจะรันได้

## Blockers

- **ไม่มี blocker ด้านโค้ด** — lint/build ผ่าน
- Runtime verification ถูกบล็อกด้วย `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` ที่ยังไม่มีใน workspace
  (ห้ามอ่าน/พิมพ์ค่า secret — ผู้ใช้จัดการผ่าน Settings → Environment)

## Technical debt

- Query ทั้งโปรเจกต์ใช้ untyped Supabase client (`any` โดยปริยาย) — ไม่มี compile-time safety กับ schema
- Business logic หนัก ๆ อยู่ใน client components (houses 1,000+ บรรทัด, navigate 1,400+ บรรทัด) — ควรพิจารณาแยก hooks/services ในอนาคต (ยังไม่ทำใน Phase 1)
- ไม่มี test framework — verification อาศัย lint/build + manual
- `src/types/supabase.ts` ต้องคงเป็น UTF-8 (ถ้า regenerate ต้องเช็ค encoding ก่อน commit)

## Important warnings

- ห้ามแก้ authentication flow, Supabase logic หรือ database schema โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรใน task
- ห้ามลบ route/feature ที่ยังใช้งานอยู่
- ห้ามใส่ fake data / fake statistics ในทุกหน้า
- ห้าม commit secrets; `.ai/` ต้องไม่เก็บ credential ใด ๆ
- `.ai/` ต้องไม่ถูกเพิ่มใน `.gitignore`

## Next Recommended Tasks (ยังไม่เริ่ม — รอคำสั่งผู้ใช้)

1. ให้ผู้ใช้ review + commit งาน Phase 1
2. Phase 2 (UI/UX ต่อยอด) ตามคำสั่งเท่านั้น
3. Regenerate Supabase types + เติม `reported_houses`/`audits` ให้ครบ
4. ทบทวน RLS บน Supabase project จริง (houses/pending/today/start_positions)
5. ล้าง dead code (distance.ts, NavigationButton.tsx, tesseract.js) เมื่อได้รับอนุญาต
