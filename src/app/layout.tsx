// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DropWay — ระบบจัดเส้นทางส่งของ",
    template: "%s | DropWay",
  },
  description:
    "ระบบจัดเส้นทางส่งของอัจฉริยะสำหรับไรเดอร์และธุรกิจขนส่ง อัพโหลดรายชื่อบ้าน จัดลำดับเส้นทาง และนำทางด้วย Google Maps",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  // ใช้ getUser() เพื่อยืนยันผู้ใช้จากฝั่ง server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="th" className={`${inter.variable} ${notoSansThai.variable}`}>
      <body className="min-h-screen">
        <ToastProvider>
          <AppShell initialUser={user}>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
