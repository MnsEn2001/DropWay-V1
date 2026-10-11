# ADR-001: สร้าง Design System เองแบบ Dependency-Free

- **Status:** accepted
- **Date:** 2026-10-11
- **Deciders:** ทีม DropWay (Phase 1)

## Decision

สร้าง shared UI components ทั้งชุดใน `src/components/ui/` ด้วย Tailwind CSS 4 + React เอง
โดยไม่เพิ่ม dependency ด้าน UI (ไม่ใช้ shadcn/ui, radix, cva, clsx, tailwind-merge)

## Context

- Phase 1 ต้องการ shared components ครบชุด (Button → Toast) เพื่อให้ทุกหน้าใช้ร่วมกัน
- โปรเจกต์เดิมไม่มี UI library ใด ๆ; เพิ่ม library ใหญ่จะกระทบ bundle และ architecture
- Task ระบุชัด: minimal changes, รักษา architecture เดิม, ไม่แตะ business logic
- ต้องคุมธีม (สี/ฟอนต์/shadow) จากที่เดียว และรองรับภาษาไทยเป็นหลัก

## Options Considered

1. **shadcn/ui + radix + cva + clsx + tailwind-merge** — ได้ a11y ครบ แต่ต้องเพิ่ม 4-5 dependencies และ port component จำนวนมาก
2. **Headless lib อื่น (headlessui ฯลฯ)** — ได้ behavior สำเร็จรูป แต่ผูกกับไลบรารีเพิ่มและต้องปรับธีมให้เข้ากับ Tailwind 4
3. **เขียนเอง dependency-free (เลือกทางนี้)** — คุมโค้ด/ธีมได้เต็ม แต่ต้องดูแล a11y เองในระดับพื้นฐาน

## Chosen Approach

Component เองทั้งหมด โดยใช้:
- `cn()` ใน `src/lib/utils.ts` สำหรับรวม class (ไม่ merge conflict)
- CSS `@theme` tokens เป็น design tokens กลาง
- native elements (`<button>`, `<input>`, `<select>`) + WAI-ARIA เบื้องต้น (`role`, `aria-*`, `aria-modal`)
- Modal/Drawer: Escape, overlay click, scroll lock และ focus เบื้องต้น

## Why

- ลด dependency/ขนาด bundle และไม่สร้างภาระอัปเดตเวอร์ชัน
- สอดคล้องข้อกำหนด Phase 1 (ไม่เปลี่ยน architecture, minimal changes)
- ทีมอ่าน/แก้โค้ดเองได้ทั้งหมด ไม่ต้องไล่ library docs

## Consequences

- **ข้อจำกัดสำคัญ:** ไม่มี tailwind-merge → **ห้าม override class ที่ชนกัน** (เช่น `h-9` ทับ `h-10`)
  ให้เพิ่ม variant/align prop ใน component แทนการส่ง class ชนกัน
- a11y ของ Modal/Drawer เป็นระดับพื้นฐาน (ยังไม่มี focus trap เต็มรูปแบบ)
- เมื่อ Phase ถัดไปต้องการ combobox/date-picker/rich behavior ควรประเมินเพิ่ม library
  และเขียน ADR ใหม่ก่อนติดตั้ง
