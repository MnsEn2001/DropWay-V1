# DropWay — Reports

โฟลเดอร์นี้เก็บ **รายงานผลที่ตรวจสอบได้จริง** ของงานสำคัญ:

- task verification (ผล lint/build/ทดสอบของงานนั้น)
- migration verification (ผลการตรวจ schema/RLS บน Supabase จริง)
- security verification
- production readiness
- major implementation reports

## กติกา

- **ห้ามสร้าง report ปลอมหรือคาดเดาผล** — ต้องมีหลักฐานจากการรันจริงเท่านั้น
- ตั้งชื่อไฟล์: `YYYY-MM-DD-<slug>.md`
- เขียนสั้น ตรงประเด็น: ทำอะไร → รันอะไร → ผลจริง → ข้อจำกัด/ความเสี่ยง
- ถ้าผลเป็น FAIL หรือ verify ไม่ได้ ให้เขียนตามจริง ห้ามกลบ
