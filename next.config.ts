// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // เปลี่ยนชื่อตามที่ Next.js 16 ต้องการ
  serverExternalPackages: ["@supabase/ssr"],

  // ลบ transpilePackages ออกไปเลย (ห้ามใช้ร่วมกัน!)
  // transpilePackages: ["@supabase/ssr"], ← ลบบรรทัดนี้ออก!

  // ถ้าอยากใช้ Turbopack ได้เต็มที่ (optional แต่แนะนำ)
  experimental: {
    // turbotrace: true,
  },
};

export default nextConfig;
