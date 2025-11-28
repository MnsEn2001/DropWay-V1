// src/app/(auth)/signup/page.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      alert("สมัครสำเร็จ! กรุณายืนยันอีเมลของคุณ");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-r from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md text-gray-800">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            สมัครสมาชิก Dropway
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            สร้างบัญชีเพื่อเริ่มใช้งาน
          </p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
          <input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            required
          />
          <input
            type="password"
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>
        <p className="text-center mt-6 text-gray-600 text-sm sm:text-base">
          มีบัญชีแล้ว?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
