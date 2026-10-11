// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/utils";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(translateAuthError(error.message));
      setLoading(false);
    } else {
      // วิธีเดียวที่เสถียรที่สุด (ทำงาน 100% บน Vercel)
      router.replace("/dashboard");
      router.refresh(); // บังคับให้ layout โหลด session ใหม่ทันที
    }
  };

  return (
    <AuthShell
      title="เข้าสู่ระบบ DropWay"
      subtitle="ยินดีต้อนรับกลับมา จัดเส้นทางส่งของให้เสร็จไวขึ้น"
      footer={
        <>
          ยังไม่มีบัญชี?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            สมัครสมาชิกฟรี
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          type="email"
          label="อีเมล"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            label="รหัสผ่าน"
            placeholder="รหัสผ่านของคุณ"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600"
          >
            {showPassword ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={loading}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </form>
    </AuthShell>
  );
}
