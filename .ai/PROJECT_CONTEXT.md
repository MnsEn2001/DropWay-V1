# DropWay — Project Context

ข้อมูลทั้งหมดในไฟล์นี้ตรวจสอบจาก repository จริง ณ 2026-10-11
ถ้าข้อมูลไม่พบใน repository จะระบุ `UNKNOWN / NOT DOCUMENTED` แทนการเดา

## Project name

DropWay (V1) — repository: `MnsEn2001/DropWay-V1`

## Project purpose

ระบบจัดเส้นทางส่งของสำหรับไรเดอร์และธุรกิจขนส่ง พื้นที่ให้บริการหลัก **อ.วังเจ้า จ.ตาก**
ช่วยลดเวลาในการเรียงลำดับจุดส่งด้วยมือ และนำทางด้วย Google Maps

## Product concept

1. นำเข้ารายชื่อบ้าน (ฟอร์ม หรือ CSV) เข้า "คลังบ้าน" กลาง
2. ดึงบ้านเข้าคิวงานของวันนี้ (ต่อผู้ใช้)
3. ระบบเรียงลำดับเส้นทางอัตโนมัติด้วยระยะทางจริง (Vincenty) จากจุดเริ่มต้น (GPS หรือตั้งเอง)
4. นำทางทีละหลังผ่าน Google Maps / เปิดเส้นทางรวม (สูงสุด 20 จุด)
5. กด "ส่งแล้ว" เพื่อตัดออกจากคิว หรือ "รายงานปัญหา" เพื่อย้ายไปแท็บรายงานแล้ว
6. งานที่ไม่เสร็จจะถูกเก็บเป็นงานค้าง (ต่อวัน) และดึงกลับเข้าคิวได้ภายหลัง

## Technology stack

| ส่วน | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | `force-dynamic` ทั้งแอป |
| Frontend | React 19, TypeScript 5 (strict) | client components เป็นหลัก |
| Styling | Tailwind CSS 4 (`@theme` tokens) | design system อยู่ใน `src/app/globals.css` |
| UI primitives | Shared components ใน `src/components/ui/` | เขียนเอง ไม่ใช้ radix/shadcn |
| Icons | lucide-react | |
| CSV | papaparse | import/export รายชื่อบ้าน |
| Backend | Supabase (Auth + Postgres + RPC) | client เดียว ไม่มี API route ของตัวเอง |
| Auth | Supabase Auth (email/password) | middleware + server getUser() |
| Middleware | `middleware.ts` (Supabase SSR cookies) | guard `/dashboard/*` |
| Storage | ไม่มีการใช้ Supabase Storage | `UNKNOWN / NOT DOCUMENTED` |
| External services | Google Maps (เปิด URL เท่านั้น ไม่มี API key) | |
| OCR | `tesseract.js` อยู่ใน dependencies | **ยังไม่ถูกใช้งานจริงในโค้ด** |

## Important routes

| Route | ประเภท | หน้าที่ |
|---|---|---|
| `/` | public | landing page |
| `/login` | public | เข้าสู่ระบบ (Supabase) |
| `/signup` | public | สมัครสมาชิก + resend confirmation |
| `/dashboard` | protected | ภาพรวมสถิติ + กิจกรรมล่าสุด |
| `/dashboard/houses` | protected | คลังบ้าน: CRUD, ค้นหา/กรอง, จัดกลุ่ม, CSV |
| `/dashboard/routes/navigate` | protected | นำทางส่งของ: คิววันนี้ / รายงานแล้ว |

## Important folders

```
src/app/                 # routes (App Router) + globals.css
src/app/(auth)/          # route group ของ login/signup
src/components/ui/       # design system components (Phase 1)
src/components/layout/   # AppShell (sidebar/topbar/bottom nav)
src/components/auth/     # AuthShell ของหน้า login/signup
src/lib/                 # supabase client/server, utils
src/types/               # generated Supabase types + tesseract stub
supabase/migrations/     # SQL migrations (มีเฉพาะ 001_security_hardening.sql)
middleware.ts            # auth guard
```

## Database objects ที่โค้ดเรียกใช้จริง

- Tables: `houses`, `today_houses`, `pending_houses`, `reported_houses`, `start_positions`, `audits`
- RPC: `refresh_and_merge_today_houses`, `save_start_position`, `get_start_position`, `clear_start_position`, `load_pending_to_today`, `archive_old_today_houses`, `archive_users_today_houses`
- หมายเหตุ: `reported_houses` และ `audits` (audits มีใน `001_security_hardening.sql`) ไม่อยู่ในไฟล์ generated types ปัจจุบัน — client ไม่ได้ผูก generic จึงยังทำงานได้ แต่ควร regenerate types จาก Supabase จริง

## Environment variables (ชื่อเท่านั้น — ห้าม commit ค่า)

| Key | ใช้ที่ | จำเป็น |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client, server, middleware | ใช่ (แอปไม่ทำงานถ้าไม่มี) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client, server, middleware | ใช่ |

## Development commands

```bash
bun install      # ติดตั้ง dependencies
bun run dev      # next dev
bun run lint     # eslint (flat config)
bun run build    # next build (รวม typecheck)
bun run start    # next start (production server)
```

Package manager ที่ใช้ในงานนี้: **bun** — repository **ไม่ track lockfile** ใด ๆ
(`bun.lock` เป็น local artifact จากเครื่องที่ติดตั้ง — untracked; ห้ามอ้างว่ามี lockfile อยู่ในเรโป)
ตัวสคริปต์ทั้งหมดตรงกับ `scripts` ใน `package.json` (dev/build/start/lint)

ห้ามคาดเดา `.env` — ผู้ใช้จัดการ secrets เอง

## Production commands

- Build: `bun run build` (Next.js framework default)
- Start: `bun run start` / hosting platform (Vercel หรือ Freebuff managed hosting) — `UNKNOWN / NOT DOCUMENTED` ว่า deploy ที่ใดเป็นหลัก

## ไม่มีในโปรเจกต์นี้ (อย่าสร้างโดยไม่สั่ง)

- ไม่มี API routes ใน `src/app/api/`
- ไม่มี test framework / test files
- ไม่มี state management library (ใช้ React state + Supabase ตรง ๆ)
- ไม่มี dark mode (Phase 1 เลือก light theme เดียว)
