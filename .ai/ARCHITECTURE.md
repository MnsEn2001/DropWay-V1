# DropWay — Architecture

อธิบาย architecture ที่มีอยู่จริงใน repository (ณ 2026-10-11) — ไม่ใช่ architecture ที่เสนอใหม่

## ภาพรวม

```
Browser
  │
  ▼
middleware.ts (Supabase SSR cookies: guard /dashboard/*, เด้งคนล็อกอินออกจาก /login,/signup)
  │
  ▼
Next.js App Router (force-dynamic ทั้งแอป)
  │  src/app/layout.tsx  → getUser() ฝั่ง server → ส่ง initialUser ให้ AppShell
  ▼
Pages (client components เป็นหลัก)
  │  src/app/(auth)/login, signup
  │  src/app/dashboard{,/houses,/routes/navigate}
  ▼
Components
  │  components/ui/*        design system (สร้างใหม่ใน Phase 1)
  │  components/layout/     AppShell (sidebar/topbar/bottom nav + auth state)
  │  components/auth/       AuthShell (กรอบหน้า login/signup)
  ▼
Lib / Services
  │  lib/supabase/client.ts  (createBrowserClient — ใช้ใน client components)
  │  lib/supabase/server.ts  (createServerClient + cookies — ใช้ใน layout)
  │  lib/utils.ts            cn(), translateAuthError()
  ▼
Supabase (Auth + Postgres + RPC)
  │  tables: houses, today_houses, pending_houses, reported_houses, start_positions, audits
  │  RPC: refresh_and_merge_today_houses, save/get/clear_start_position, load_pending_to_today, archive_*
```

## App structure (src/app)

| Path | ชนิด | หมายเหตุ |
|---|---|---|
| `layout.tsx` | server | next/font (Inter + Noto Sans Thai), ToastProvider, AppShell, `getUser()` |
| `globals.css` | — | design tokens (Tailwind 4 `@theme`) + base styles + keyframes |
| `page.tsx` | server | landing page |
| `(auth)/login/page.tsx` | client | Supabase `signInWithPassword` แล้ว `router.replace("/dashboard")` |
| `(auth)/signup/page.tsx` | client | `signUp` + resend confirmation + timer |
| `dashboard/page.tsx` | client | stats, quick actions, activity (audits) |
| `dashboard/layout.tsx` | server | wrapper พื้นหลัง |
| `dashboard/houses/page.tsx` | client | CRUD + filter + CSV + pagination |
| `dashboard/routes/navigate/page.tsx` | client | คิววันนี้/รายงานแล้ว + GPS + เรียงเส้นทาง |

## Component structure (src/components)

- `ui/` — shared components ของ design system (base ของทุกหน้า):
  Button, Input, Textarea, Select, Checkbox, Radio, Card (+Header/Title/Content/Footer),
  Badge, StatusBadge/StatusDot/StatusIcon (Delivery Status System),
  Alert, Modal, Drawer, Dropdown, Tooltip, Tabs, Table, Avatar,
  EmptyState, LoadingState, Skeleton, ErrorState, Toast (provider + useToast),
  PageHeader, SectionHeader, StatCard, QuickAction — export ผ่าน `ui/index.ts`
- `layout/AppShell.tsx` — navigation shell ทั้งหมด:
  - Desktop: fixed sidebar (ซ้าย) + topbar + account dropdown
  - Mobile: topbar + bottom navigation (3 แท็บจริง) + account drawer
  - ถือ auth state subscription (`onAuthStateChange`) + auto token refresh + logout
  - หน้า `/login`, `/signup` → ไม่แสดง chrome
- `auth/AuthShell.tsx` — กรอบการ์ดกลางจอสำหรับ login/signup
- หมายเหตุ: `components/layout/Navbar.tsx` เดิมถูกลบใน Phase 1 (แทนที่ด้วย AppShell)
- Dead code ที่ยังอยู่ (ไม่ได้ถูก import): `components/routes/NavigationButton.tsx`, `lib/distance.ts`

## Lib structure (src/lib)

- `supabase/client.ts` — `createBrowserClient` (ไม่ได้ผูก generic `Database` → query คืน type แบบ any)
- `supabase/server.ts` — `createServerClient` + `cookies()` (setAll ว่างไว้)
- `utils.ts` — `cn()` รวม class, `translateAuthError()` แปล error จาก Supabase เป็นไทย

## Auth flow

1. `/login` (client) → `supabase.auth.signInWithPassword` → สำเร็จ → `router.replace("/dashboard")` + `router.refresh()`
2. `/signup` (client) → `supabase.auth.signUp({ emailRedirectTo: origin + "/dashboard" })` → แสดงหน้าให้ยืนยันอีเมล + resend
3. `middleware.ts` — ทำงานกับ matcher `["/", "/login", "/signup", "/dashboard/:path*"]`:
   - ยังไม่ล็อกอิน + เข้า `/dashboard/*` → redirect `/login`
   - ล็อกอินแล้ว + เข้า `/login`,`/signup` → redirect `/dashboard`
4. Root layout (server) เรียก `supabase.auth.getUser()` เพื่อดึง user จริงด้วย cookie แล้วส่งให้ AppShell
5. AppShell (client) subscribe `onAuthStateChange` + refresh token เมื่อใกล้หมดอายุ
6. Logout → `supabase.auth.signOut()` → `window.location.href = "/login"`

## Data flow ต่อหน้า

| หน้า | อ่าน | เขียน |
|---|---|---|
| dashboard | `houses` (count), `pending_houses` (count), RPC `refresh_and_merge_today_houses`, `audits` | — |
| houses | `houses` ทั้งตาราง (client-side filter/sort/paginate) | insert/update/delete `houses`, insert `today_houses` |
| navigate | RPC `refresh_and_merge_today_houses`, `pending_houses`, `reported_houses`, RPC `get_start_position` | update `today_houses.order_index`, delete `today_houses`, insert/delete `reported_houses`, delete `pending_houses`, RPC `save/clear_start_position`, RPC `load_pending_to_today`, localStorage (จุดเริ่มต้นของแท็บรายงานแล้ว) |

## Design system (Phase 1)

- Tokens อยู่ใน `src/app/globals.css` (`@theme inline`):
  - สี: `primary` (indigo scale), `success`, `warning`, `danger`, `info`, `background` (`#f8fafc`), `surface` (`#ffffff`)
  - ฟอนต์: `--font-sans` = Inter + Noto Sans Thai (โหลดผ่าน `next/font` ใน layout)
  - Elevation: `shadow-card`, `shadow-card-hover`, `shadow-elevated`
- Radius มาตรฐาน: ปุ่ม/input `rounded-lg`, card `rounded-xl`, modal/drawer `rounded-2xl`, pill `rounded-full`
- ใช้ **light theme เท่านั้น** (ลบ dark-mode media query เดิมที่ทำให้ contrast พัง)
- Delivery Status System: 10 สถานะ (`PENDING`…`RESCHEDULED`) เป็น UI representation เท่านั้น
  ไม่ผูกกับ database — ห้ามตีความว่า DB มี state machine
- ห้ามเพิ่ม UI library ใหม่โดยไม่ปรึกษา — ระบบปัจจุบันไม่พึ่ง radix/cva/clsx

## Important dependencies

`next@16`, `react@19`, `@supabase/ssr`, `@supabase/supabase-js`, `tailwindcss@4`, `lucide-react`, `papaparse`, `tesseract.js` (ยังไม่ใช้)

## Configuration

- `next.config.ts` — `reactStrictMode: true`, `serverExternalPackages: ["@supabase/ssr"]`
- `tsconfig.json` — strict, path alias `@/*` → `./src/*`
- `eslint.config.mjs` — flat config (ซ่อมใน Phase 1: `defineConfig([...nextVitals, ...nextTs, globalIgnores([...])])` + `@typescript-eslint/no-explicit-any: error`)
- `.gitignore` ถูกเพิ่มในงาน `.ai/` — ignore `node_modules`, `.next/` และ env files แต่ **ไม่ ignore `.ai/`** (เจตนา: เอกสาร AI ต้องถูก track ใน repo)
