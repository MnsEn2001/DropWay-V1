// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

// สำคัญมาก: ต้อง await cookies() ก่อนถึงจะมี .getAll() และ .set()
export async function createServerSupabase() {
  const cookieStore = await cookies(); // ← await ตรงนี้!

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // set ใน Server Component ไม่ได้อยู่แล้ว → ignore
          }
        },
      },
    },
  );
}
