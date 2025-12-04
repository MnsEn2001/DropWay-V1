// src/lib/supabase.ts
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

export const supabase = createPagesBrowserClient<Database>();
