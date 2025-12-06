// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

// บังคับให้ layout โหลดใหม่ทุก request → แก้ปัญหา Navbar ไม่เปลี่ยน 100%
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dropway - ระบบส่งของจ.ตาก",
  description: "จัดการบ้าน เส้นทาง และการส่งของอย่างชาญฉลาด",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ดึง user จาก server โดยตรง
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user: User | null = session?.user ?? null;

  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="bg-gray-50 font-sans antialiased min-h-screen">
        <Navbar initialUser={user} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
