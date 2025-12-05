// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // ต้องเว้น setAll ว่างไว้แบบนี้เท่านั้น ถึงจะไม่ error ใน Next.js 16
        setAll() {
          // do nothing – เราอ่านอย่างเดียว ไม่ต้องเขียน cookie ใน layout
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}
