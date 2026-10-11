# DropWay AI Rules

กฎกลางสำหรับ AI Agent ทุกตัวที่ทำงานกับโปรเจกต์ DropWay
ถ้ากฎข้อใดขัดกับ task ให้รายงานความขัดแย้งก่อนลงมือ

## 1. Source of Truth

ก่อนแก้ไข code ต้องตรวจสอบ source ของ repository จริงก่อน

- ห้ามเดาโครงสร้าง project
- ห้ามเดา database schema
- ห้ามเดา API / RPC
- ห้ามเดา authentication flow
- ห้ามเดา business rules

ถ้าไม่แน่ใจ ให้ inspect ก่อนเสมอ

## 2. Inspect Before Modify

ก่อนแก้ไขทุกครั้ง:

- ตรวจ `git status`, branch, latest commit
- อ่าน `.ai/AI_HANDOFF.md`
- อ่าน `.ai/CURRENT_STATE.md`
- อ่าน `.ai/PROJECT_CONTEXT.md`
- อ่าน `.ai/ARCHITECTURE.md` เมื่อเกี่ยวข้อง
- อ่าน task ที่กำลังทำ
- inspect source files ที่จะแก้จริง

ห้ามเริ่มแก้ทันทีโดยไม่ inspect

## 3. Preserve Existing System

AI ต้องรักษา:

- authentication / authorization
- Supabase (Auth, Postgres, RPC)
- database security / RLS
- existing routes และ features
- existing business logic
- existing API contracts

เว้นแต่ task ระบุให้เปลี่ยนอย่างชัดเจนและได้รับอนุญาต

## 4. No Fake Systems

ห้ามสร้าง:

- fake API
- fake database
- fake production data
- fake authentication
- mock business logic เพื่อให้ดูเหมือนเสร็จ

ถ้าของจริงยังไม่มี ให้ระบุว่า `BLOCKED` หรือ `NOT IMPLEMENTED`

## 5. No Duplicate Systems

ก่อนสร้าง component / utility / API / table / function / state / documentation
ต้องค้นหาก่อนว่ามีของเดิมหรือไม่ (ดู `.ai/ARCHITECTURE.md`) ถ้ามีแล้วให้ reuse

## 6. Minimal Changes

แก้เฉพาะสิ่งที่ task ต้องการ

- ห้าม refactor ใหญ่โดยไม่มีเหตุผล
- ห้ามเปลี่ยน architecture เพียงเพื่อความสวยงาม
- ห้ามแก้ไฟล์ที่ไม่เกี่ยวข้อง

## 7. Security First

ห้ามลดระดับ security เพื่อให้ feature ทำงาน

ห้าม bypass: authentication, authorization, RLS, ownership checks, validation
ห้าม commit secrets ลง repository (รวมถึงใน `.ai/`)

## 8. Verification

ทุก task ต้องตรวจสอบตามความเหมาะสม:

```bash
bun run lint   # eslint
bun run build  # next build (รวม typecheck)
```

และถ้ามีการแก้ logic ให้ทดสอบพฤติกรรมจริงเท่าที่ทำได้
ห้ามรายงานว่า PASS ถ้ายังไม่ได้รันจริง

## 9. Git Safety

ก่อนทำงานต้องรู้: current branch, current commit SHA, working tree status
หลังทำงานต้องตรวจอีกครั้ง

- ห้าม overwrite งานของคนอื่น
- ห้าม reset repository โดยไม่มีคำสั่งชัดเจน
- ห้าม force push
- การ commit/push เป็นสิทธิ์ของผู้ใช้ (ผ่าน Changes panel)

## 10. Stop Conditions

AI ต้องหยุดและรายงานเมื่อ:

- task เสร็จ + verification ผ่าน
- พบ requirement ที่ขัดแย้งกัน
- พบ security risk
- ต้องเปลี่ยน architecture/database schema แต่ task ไม่ได้อนุญาต
- ต้องใช้ credential/secret ที่ไม่มี

ห้ามขยาย scope เอง
