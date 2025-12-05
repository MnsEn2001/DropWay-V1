// src/middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server"; // เพิ่ม type NextRequest ตรงนี้!

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // สร้าง client ด้วยฟังก์ชันใหม่ (เวอร์ชัน 2025)
  const supabase = createMiddlewareClient({ req, res });

  // ดึง session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // ถ้ายังไม่ล็อกอิน แต่พยายามเข้า dashboard → เด้งไป login
  if (pathname.startsWith("/dashboard") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ถ้าล็อกอินแล้ว แต่ไปหน้า login หรือ signup → เด้งไป dashboard
  if ((pathname === "/login" || pathname === "/signup") && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// ระบุ path ที่ middleware ทำงาน
export const config = {
  matcher: [
    "/dashboard/:path*", // ทุกหน้าใน dashboard
    "/login",
    "/signup",
  ],
};
