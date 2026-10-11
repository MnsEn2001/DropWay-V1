# DropWay

ระบบจัดเส้นทางส่งของสำหรับไรเดอร์และธุรกิจขนส่ง พื้นที่ให้บริการหลัก **อ.วังเจ้า จ.ตาก**

อัพโหลดรายชื่อบ้าน → จัดลำดับเส้นทางอัตโนมัติ → นำทางด้วย Google Maps

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres + RPC) · lucide-react · papaparse

## Getting Started

1. ตั้งค่า environment variables (ผ่าน Settings → Environment หรือ `.env.local` ของคุณ):

   | Key | จำเป็น |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | ใช่ |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ใช่ |

2. ติดตั้ง dependencies และรัน dev server:

   ```bash
   bun install
   bun run dev
   ```

3. เปิด http://localhost:3000

## Scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `bun run dev` | เปิด dev server |
| `bun run build` | production build (รวม typecheck) |
| `bun run start` | รัน production server |
| `bun run lint` | ตรวจ ESLint (flat config) |

## Routes

| Route | หน้าที่ |
|---|---|
| `/` | landing page |
| `/login`, `/signup` | เข้าสู่ระบบ / สมัครสมาชิก (Supabase Auth) |
| `/dashboard` | ภาพรวมสถิติและกิจกรรมล่าสุด |
| `/dashboard/houses` | คลังบ้าน: เพิ่ม/แก้/ลบ, ค้นหา/กรอง, นำเข้า-ส่งออก CSV |
| `/dashboard/routes/navigate` | นำทางส่งของ: คิววันนี้ / รายงานแล้ว |

## Documentation for AI Agents

เอกสารสำหรับ AI Agent และ workflow ทั้งหมดอยู่ในโฟลเดอร์ [`.ai/`](./.ai/):

- เริ่มจาก [`.ai/AI_HANDOFF.md`](./.ai/AI_HANDOFF.md)
- กฎที่ต้องรู้: [`.ai/AI_RULES.md`](./.ai/AI_RULES.md)
- สถานะปัจจุบัน: [`.ai/CURRENT_STATE.md`](./.ai/CURRENT_STATE.md)

ห้าม commit secrets ลง repository (รวมถึงใน `.ai/`)
