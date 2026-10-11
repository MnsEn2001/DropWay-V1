# DropWay — AI Workflow

workflow มาตรฐานสำหรับทุก task ใน DropWay
AI ต้องไม่ข้าม **Inspect** และไม่ข้าม **Verify**

## PHASE 1 — Understand

- อ่าน task ให้ครบก่อนแตะโค้ด
- ระบุ acceptance criteria: ไฟล์/route/หน้าจอที่ต้องได้, พฤติกรรมที่ต้องคงอยู่
- ระบุสิ่งที่เป็น Non-Goals

## PHASE 2 — Inspect

- `git status`, branch, latest commit SHA, working tree
- อ่าน `.ai/AI_HANDOFF.md`, `.ai/CURRENT_STATE.md`, `.ai/PROJECT_CONTEXT.md`
- ค้นหาโค้ดเดิมที่เกี่ยวข้องก่อน (อย่าสร้างซ้ำ — ดู `.ai/ARCHITECTURE.md`)
- ตรวจ `package.json` ว่ามี dependency ที่จะใช้อยู่แล้วหรือไม่
- ยืนยันกับตัวเองว่า business logic ปัจจุบันหน้าตาอย่างไร (ก่อน-หลังต้องเทียบได้)

## PHASE 3 — Plan

- เขียน task brief สั้น ๆ ใน `.ai/tasks/active/` (ใช้ `TASK_TEMPLATE.md`) สำหรับงานที่ไม่ trivial
- ระบุไฟล์ที่คาดว่าจะแตะ + วิธี verify
- ถ้าแตะ auth / database / business logic: ระบุความเสี่ยงและขอหยุดถ้า task ไม่ได้อนุญาต

## PHASE 4 — Implement

- Minimal changes — แก้เฉพาะที่ task ต้องการ
- Reuse shared components/utilities ที่มีอยู่
- รักษา import alias และโครงสร้างโปรเจกต์เดิม
- หลีกเลี่ยง `any` (lint ตั้งเป็น error)

## PHASE 5 — Verify

รันจริงตามลำดับ:

```bash
bun run lint
bun run build
```

- ตรวจว่า behavior ที่รับปากใน task ทำงานจริง (เท่าที่ environment เอื้อ)
- ถ้ามี runtime/preview ที่ทดสอบได้ ให้ทดสอบ; ถ้าติด credential ให้ระบุเป็น blocker
- ห้ามรายงาน PASS ถ้ายังไม่ได้รัน

## PHASE 6 — Review

- `git diff` ดูทุกไฟล์ที่เปลี่ยน — ห้ามมีไฟล์แปลกปลอม/secrets
- ตรวจว่าไม่มี functionality เดิมหาย
- ตรวจ mobile/desktop layout ที่ปรับ (ไม่มี overflow, ปุ่มไม่ล้น, touch target ≥ ~40px)

## PHASE 7 — Update Handoff

- อัปเดต `.ai/CURRENT_STATE.md` ให้ตรงสถานะจริง
- อัปเดต `.ai/AI_HANDOFF.md` (งานล่าสุด, known issues, next task)
- เพิ่ม entry ใน `.ai/CHANGELOG.md` เมื่อ change สำคัญต่อ project state
- ถ้ามี decision สำคัญ → เพิ่ม ADR ใน `.ai/decisions/`

## PHASE 8 — Final Report

รายงานสั้น ตรงความจริง:

- ไฟล์ที่เปลี่ยน (changed files)
- สิ่งที่ทำ + ทำไม
- ผล verification: lint / build / อื่น ๆ (PASS/FAIL + ข้อจำกัด)
- ความเสี่ยง + งานถัดไปที่เสนอ
- แล้ว **หยุด** — ไม่ขยาย scope ต่อเอง

## กติกาเสริม

- task เสร็จแล้ว → ย้าย/สรุปจาก `tasks/active/` ไป `tasks/archive/` ได้ตามความเหมาะสม
- อย่าสร้าง task/report/ADR เปล่า ๆ ที่ไม่มีงานจริง
- เอกสารทั้งหมดต้องอิงสถานะจริง — source code ชนะเอกสารเสมอ
