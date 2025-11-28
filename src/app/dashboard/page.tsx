// src/app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Home,
  MapPin,
  PackageCheck,
  PackageX,
  Plus,
  Upload,
  RefreshCw,
  User,
} from "lucide-react";

interface TodayHouse {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  delivered: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const [totalHouses, setTotalHouses] = useState(0);
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [remainingToday, setRemainingToday] = useState(0);
  const [recentHouses, setRecentHouses] = useState<TodayHouse[]>([]);
  const [userName, setUserName] = useState("เพื่อน");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ดึง user name
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setUserName(profile?.full_name || "เพื่อน");
      }

      // ดึงจำนวนบ้านทั้งหมดจาก houses
      const { count: totalCount } = await supabase
        .from("houses")
        .select("*", { count: "exact", head: true });
      setTotalHouses(totalCount || 0);

      // ดึงจำนวนที่ส่งแล้ววันนี้จาก today_houses
      const { count: deliveredCount } = await supabase
        .from("today_houses")
        .select("*", { count: "exact", head: true })
        .eq("delivered", true);
      setDeliveredToday(deliveredCount || 0);

      // ดึงจำนวนที่เหลือส่งวันนี้จาก today_houses
      const { count: remainingCount } = await supabase
        .from("today_houses")
        .select("*", { count: "exact", head: true })
        .eq("delivered", false);
      setRemainingToday(remainingCount || 0);

      // ดึง recent houses (top 5 ล่าสุด)
      const { data: recentData } = await supabase
        .from("today_houses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentHouses(recentData || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Initial load และ auto-refresh ทุก 30 วินาที
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  // Progress percentage
  const progressPercent =
    remainingToday + deliveredToday > 0
      ? Math.round((deliveredToday / (remainingToday + deliveredToday)) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-lg text-gray-500 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Welcome */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-2">
          <Home className="w-10 h-10 text-blue-600" />
          ยินดีต้อนรับกลับ, {userName}!
        </h1>
        <p className="text-gray-600 mt-2">
          วันนี้มีงานส่ง {remainingToday} ชิ้น รีเฟรชอัตโนมัติทุก 30 วินาที
        </p>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
        <button
          onClick={fetchData}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/dashboard/houses"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition"
        >
          <Plus className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            เพิ่มบ้านใหม่
          </span>
        </a>
        <a
          href="/dashboard/routes"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition"
        >
          <MapPin className="w-8 h-8 text-green-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            ดูเส้นทางวันนี้
          </span>
        </a>
        <a
          href="/dashboard/routes/upload"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition"
        >
          <Upload className="w-8 h-8 text-purple-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">อัพโหลด CSV</span>
        </a>
        <button
          onClick={() => (window.location.href = "/dashboard/houses")}
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition"
        >
          <User className="w-8 h-8 text-indigo-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            จัดการคลังบ้าน
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-5xl font-bold text-blue-600">{totalHouses}</h3>
          <p className="text-gray-600 mt-2">บ้านทั้งหมดในคลัง</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <PackageCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-5xl font-bold text-green-600">
            {deliveredToday}
          </h3>
          <p className="text-gray-600 mt-2">ส่งแล้ววันนี้</p>
          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {progressPercent}% สำเร็จ
          </p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <PackageX className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h3 className="text-5xl font-bold text-orange-600">
            {remainingToday}
          </h3>
          <p className="text-gray-600 mt-2">เหลือส่งวันนี้</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            กิจกรรมล่าสุด (วันนี้)
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentHouses.length > 0 ? (
            recentHouses.map((house) => (
              <div key={house.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {house.full_name}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {house.address}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{house.phone}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        house.delivered
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {house.delivered ? "ส่งแล้ว" : "รอดำเนินการ"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              ยังไม่มีกิจกรรมวันนี้ ลองเพิ่มงานส่งดู!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
