# รายงานผล Phase 1 — UI/UX Design System & Visual Foundation

วันที่: 2026-10-11
Commit ก่อนเริ่ม: `7b96d91d583cc7372672fe625527dba60d1dcce9` (branch `main`)
สถานะ commit หลังงาน: commit แล้ว — `ab627da5ba65d677fce71c221af06bd0e82027e7` (feat(ui): Phase 1) และ push ขึ้น `origin/main` เมื่อ 2026-10-11 (ดู `.ai/CHANGELOG.md`)

## ขอบเขตที่ตรวจ

งาน Phase 1 ครอบคลุม: design tokens, shared UI components, delivery status system,
app shell (sidebar/topbar/bottom nav), ปรับทุกหน้า (landing/auth/dashboard/houses/navigate),
loading/empty/error states, a11y เบื้องต้น และการซ่อมเครื่องมือ verification (eslint config)

## ผลการรัน (คำสั่งจริง + exit code จริง)

| คำสั่ง | ผล | หมายเหตุ |
|---|---|---|
| `./node_modules/.bin/tsc --noEmit` | **PASS** (exit 0) | TypeScript strict, ไม่มี error |
| `bun run lint` (`eslint .`) | **PASS** (exit 0) | 0 error, 0 warning (หลังซ่อม `eslint.config.mjs` และแก้ตาม rule ของ eslint-plugin-react-hooks v6 เช่น `set-state-in-effect`, `immutability`) |
| `bun run build` (`next build`, Turbopack) | **PASS** (exit 0) | ทุก route เป็น dynamic (`ƒ`): `/`, `/_not-found`, `/dashboard`, `/dashboard/houses`, `/dashboard/routes/navigate`, `/login`, `/signup` |

หมายเหตุ: หลังการรันชุดแรก ได้แยก `QuickAction` (quick action card ของ dashboard) เป็น shared component
ใน `src/components/ui/quick-action.tsx` ตามรายการ component ที่โจทย์กำหนด แล้ว rerun ทั้ง 3 คำสั่ง
(`tsc --noEmit`, `eslint .`, `next build`) — ผล PASS ทั้งหมด (exit 0) หลังการแก้ครั้งสุดท้าย

## ปัญหาที่พบระหว่างทางและวิธีแก้

1. `eslint.config.mjs` เดิมพัง (`...globalIgnores` spread ฟังก์ชัน + key `ignorePatterns` ไม่ถูกต้อง) → lint รันไม่ได้เลย
   แก้เป็น flat config ที่ถูกต้อง (`defineConfig([...nextVitals, ...nextTs, globalIgnores([...])])`) และคง `no-explicit-any: error`
2. `src/types/supabase.ts` เป็น **UTF-16** → ESLint ขึ้น `Parsing error: File appears to be binary`
   แก้โดยแปลงไฟล์เป็น UTF-8 (เนื้อหาเดิมทุกบรรทัด ไม่มีการแก้ชนิดข้อมูล)
3. eslint-plugin-react-hooks v6 ใหม่บังคับ rule `set-state-in-effect` / `immutability`
   แก้ด้วยการย้าย fetch logic เข้า effect พร้อม cancellation flag + reloadKey (houses/dashboard),
   inline fetch ของแท็บรายงาน (navigate), และเลิกใช้ mutable cache ที่ hook ครอบไว้
4. `@typescript-eslint/no-explicit-any` (ตั้งเป็น error ตาม config เดิม) → ลบ `any` ทั้งหมดในโค้ดแอป
   และให้ type จริงกับ `src/types/tesseract.d.ts`
5. Custom font โหลดผ่าน `<link>` (warning `no-page-custom-font`) → เปลี่ยนมาใช้ `next/font` (Inter + Noto Sans Thai)

## สิ่งที่ยัง verify ไม่ได้ (ข้อจำกัดจริง)

- **Runtime / preview:** เปิด dev server ผ่าน managed preview สำเร็จ (Next.js 16 ready ใน 473ms)
  แต่ทุก route (`/`, `/login`, `/signup`, `/dashboard`, `/dashboard/houses`) ตอบ **500**
  ด้วย error `Your project's URL and Key are required to create a Supabase client!`
  (throw ที่ `src/lib/supabase/server.ts:8` ผ่าน `RootLayout`) เพราะ workspace ไม่มี
  `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — ไม่ได้ทดสอบการ render จริงในเบราว์เซอร์
  → เมื่อผู้ใช้ใส่คีย์แล้ว ให้ `freebuff-preview restart` แล้ว re-verify หน้านี้
- **Responsive:** ตรวจจากโครงสร้างโค้ด (mobile-first classes, bottom nav, ไม่มี fixed-width table,
  touch target ปุ่ม ≥ 36–40px) แต่ยังไม่ได้ทดสอบด้วย viewport จริงในเบราว์เซอร์
- **พฤติกรรมกับ Supabase จริง:** RPC (`refresh_and_merge_today_houses`, `save/get/clear_start_position`,
  `load_pending_to_today`) และตาราง `reported_houses`/`audits` ยังไม่ถูกทดสอบกับ project จริงในรอบนี้

## ความเสี่ยงที่เหลือ

- การเรียงเส้นทาง (Vincenty + cluster 500 ม.) ถูก refactor ให้เป็น generic function เพื่อลด `any`
  โดยรักษาเงื่อนไขเดิมทุกบรรทัด — ควรทดสอบกับข้อมูลจริงเมื่อมี env และข้อมูลตัวอย่าง
- Modal/Drawer มี Escape/overlay/scroll lock แต่ยังไม่มี focus trap เต็มรูปแบบ (ดู ADR-001)
