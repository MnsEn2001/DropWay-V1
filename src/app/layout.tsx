// src/app/layout.tsx  ← แก้แค่ 2 บรรทัดนี้
import { cookies } from "next/headers";
import { Navbar } from "@/components/layout/Navbar";

export const dynamic = "force-dynamic"; // เพิ่มบรรทัดนี้!

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // ใช้ header ที่เปลี่ยนทุก request เพื่อหลอก Next.js ไม่ให้ cache
  const requestId = cookieStore.get("request-id")?.value || Date.now().toString();

  const { getUser = async () => {
    "use server";
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  };

  const user = await getUser();

  return (
    <html lang="th">
      <body>
        <Navbar initialUser={user} />
        {children}
      </body>
    </html>
  );
}
