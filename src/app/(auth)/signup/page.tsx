// src/app/(auth)/signup/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/utils";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const startResendTimer = () => {
    setResendTimer(60);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resendConfirmation = async () => {
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (resendError) {
      setError(translateAuthError(resendError.message));
    } else {
      startResendTimer();
      toast("ส่งลิงก์ยืนยันใหม่เรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของคุณ", "success");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (signupError) {
      setError(translateAuthError(signupError.message));
    } else {
      setShowSuccess(true);
      startResendTimer();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (showSuccess) {
    return (
      <AuthShell
        title="สมัครสมาชิกสำเร็จ!"
        subtitle="เหลืออีกขั้นตอนเดียวก็เริ่มใช้งานได้"
      >
        <div className="space-y-5 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success-50 text-success-600">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="text-sm text-slate-600">
            กรุณากดลิงก์ยืนยันที่ส่งไปยังอีเมลของคุณ
            <br />
            <span className="font-semibold text-slate-900">{email}</span>
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {canResend ? (
              <button
                type="button"
                onClick={resendConfirmation}
                className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                ส่งลิงก์ยืนยันใหม่
              </button>
            ) : (
              <span>
                ส่งลิงก์ยืนยันใหม่ได้ใน{" "}
                <span className="font-bold text-primary-600">
                  {resendTimer} วินาที
                </span>
              </span>
            )}
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            ไปที่หน้าเข้าสู่ระบบ
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="สมัครสมาชิก DropWay"
      subtitle="สร้างบัญชีเพื่อเริ่มจัดเส้นทางส่งของ"
      footer={
        <>
          มีบัญชีแล้ว?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            เข้าสู่ระบบ
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
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
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
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

        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            label="ยืนยันรหัสผ่าน"
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600"
          >
            {showConfirmPassword ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </Button>
      </form>
    </AuthShell>
  );
}
