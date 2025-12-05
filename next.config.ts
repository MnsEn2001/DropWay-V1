// next.config.ts   (ดีแล้ว)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@supabase/ssr"],
  experimental: {
    // turbotrace: true,
  },
};

export default nextConfig;
