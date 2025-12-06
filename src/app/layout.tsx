// src/app/layout.tsx
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

// บังคับโหลดใหม่ทุก request + ไม่ cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  // ดึง session ครั้งแรก
  let {
    data: { session },
  } = await supabase.auth.getSession();

  // ถ้ามี session และใกล้หมดอายุ → refresh แล้วดึงใหม่
  if (session) {
    const expiresAt = session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);

    if (expiresAt - now < 600) {
      // น้อยกว่า 10 นาที
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        const { data } = await supabase.auth.getSession(); // ดึงใหม่ทั้งหมด
        session = data.session; // อัปเดต session ตัวใหม่
      }
    }
  }

  const user: User | null = session?.user ?? null;

  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 font-sans antialiased min-h-screen">
        <Navbar initialUser={user} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
