// src/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase"; // เพิ่มบรรทัดนี้

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// เพิ่ม <Database> ที่นี่
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
