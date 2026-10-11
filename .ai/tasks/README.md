# DropWay — Task System

ใช้สำหรับงานที่มีขอบเขตชัดเจนและต้องมีร่องรอยให้ AI/คนถัดไปตรวจสอบได้

## โครงสร้าง

```
tasks/
  README.md            ← ไฟล์นี้
  TASK_TEMPLATE.md     ← เทมเพลตการเขียน task
  active/              ← task ที่กำลังทำ (ไฟล์ .md หนึ่งไฟล์ต่อหนึ่ง task)
```

- ทุก task ใช้ `TASK_TEMPLATE.md` เป็นโครง
- ตั้งชื่อไฟล์: `TASK-XXX-<slug>.md` (เช่น `TASK-002-houses-filter.md`)
- task เสร็จแล้วให้สรุปผลในไฟล์ และย้ายออกจาก `active/` (ไป `tasks/archive/` เมื่อมีการใช้งานจริง)
- อัปเดต `.ai/CURRENT_STATE.md` และ `.ai/CHANGELOG.md` เมื่อ task ที่สำคัญเสร็จ

## กติกา

- ห้ามสร้าง task จำนวนมากโดยไม่มีงานจริง — 1 ไฟล์ = 1 งานที่ลงมือทำจริง
- Scope ต้องชัด และ Non-Goals ต้องชัด (กันการขยาย scope เอง)
- ถ้า task แตะ auth/database/RLS ต้องระบุใน Constraints + Stop Conditions เสมอ
