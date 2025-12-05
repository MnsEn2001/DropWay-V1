import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // 🔥 สร้าง Supabase client พร้อม cookie handler แบบถูกต้องสำหรับ Vercel
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: true,
              sameSite: "lax", // ⭐ สำคัญมาก ทำให้ cookie ใช้ใน prod ได้
              path: "/",
            });
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const pathname = req.nextUrl.pathname;

  // 🔐 ต้องล็อกอินก่อนเข้า dashboard
  if (pathname.startsWith("/dashboard") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔐 ถ้ามี session แล้ว ไม่ให้เข้าหน้า login/signup อีก
  if ((pathname === "/login" || pathname === "/signup") && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// ⭐ matcher ต้องแบบนี้เพื่อให้โหลด cookie ถูกต้องทั่วทั้งแอป
export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*"],
};
