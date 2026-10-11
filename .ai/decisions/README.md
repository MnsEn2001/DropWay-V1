# DropWay — Decision Records (ADR)

ใช้บันทึก **architectural decisions ที่สำคัญ** เพื่อให้ AI/คนถัดไปรู้ว่า "ทำไม" ไม่ใช่แค่ "ทำอะไร"

## ใช้ ADR เมื่อ

- เลือก/ไม่เลือก library หรือ pattern ที่กระทบทั้งระบบ
- เปลี่ยนโครงสร้าง auth / data flow / design system
- มี trade-off ที่ต้องจำระยะยาว

## ไม่ใช้ ADR เมื่อ

- เรื่องเล็ก ๆ ที่แก้ได้ทันที (แก้ CSS, แก้ข้อความ, fix bug เล็ก)
- รายละเอียด implementation ทั่วไป (ให้อยู่ใน task/changelog แทน)

## รูปแบบการตั้งชื่อ

`ADR-XXX-<slug>.md` (เช่น `ADR-002-workers-queue.md`) ใช้ `ADR_TEMPLATE.md` เป็นโครง
สถานะ: `proposed` → `accepted` → (ภายหลัง) `superseded by ADR-XXX`
