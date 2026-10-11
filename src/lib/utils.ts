/**
 * รวม class ของ Tailwind แบบมีเงื่อนไข (ไม่ต้องใช้ dependency เพิ่ม)
 */
export function cn(
  ...classes: Array<string | number | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * แปลข้อความ error จาก Supabase Auth เป็นภาษาไทยที่ผู้ใช้อ่านเข้าใจ
 * (ไม่ได้เปลี่ยนพฤติกรรมการยืนยันตัวตน เพียงเปลี่ยนข้อความที่แสดง)
 */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง";
  }
  if (m.includes("email not confirmed")) {
    return "อีเมลนี้ยังไม่ได้ยืนยัน กรุณากดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ";
  }
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "อีเมลนี้ถูกสมัครไว้แล้ว กรุณาเข้าสู่ระบบแทน";
  }
  if (m.includes("password should be at least")) {
    return "รหัสผ่านสั้นเกินไป กรุณาใช้อย่างน้อย 6 ตัวอักษร";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }
  return message;
}
