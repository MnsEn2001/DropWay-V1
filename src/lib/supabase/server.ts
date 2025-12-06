// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // สำคัญมาก! อย่า set cookie ใน layout → ใส่ฟังก์ชันว่างไว้
        setAll() {
          // do nothing – เราแค่ "อ่าน" session ไม่ได้เขียน
        },
      },
    },
  );
};
