"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Home, MapPin, Upload } from "lucide-react";

export default function DashboardPage() {
  const [totalHouses, setTotalHouses] = useState(0);
  const [todayHouses, setTodayHouses] = useState(0);
  const [userName, setUserName] = useState("เพื่อน");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data function - ไวขึ้นด้วย RPC สำหรับ today
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // ดึง user name - ลบ profile query (ไม่มี user_profiles)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserName(user?.email?.split("@")[0] || "เพื่อน"); // fallback จาก email
      // ดึงจำนวนบ้านทั้งหมดจาก houses
      const { count: totalCount } = await supabase
        .from("houses")
        .select("*", { count: "exact", head: true });
      setTotalHouses(totalCount || 0);
      // ดึงจำนวนงานวันนี้ด้วย RPC (ไว)
      const { data: todayData } = await supabase.rpc(
        "refresh_and_merge_today_houses",
      );
      setTodayHouses(todayData?.length || 0);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชเบราว์เซอร์อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Initial load เท่านั้น ไม่มี auto-refresh
  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="text-base sm:text-lg text-gray-500 flex items-center gap-2">
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header with Welcome */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 flex items-center gap-2">
            <Home className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            ยินดีต้อนรับกลับ
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            วันนี้มีงาน {todayHouses} รายการ
          </p>
        </div>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      </div>

      {/* Quick Actions - รองรับมือถือ */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/houses"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
        >
          <MapPin className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            คลังบ้าน ({totalHouses})
          </span>
        </a>
        <a
          href="/dashboard/routes/navigate"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
        >
          <MapPin className="w-8 h-8 text-green-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            เส้นทางวันนี้ ({todayHouses})
          </span>
        </a>
        <a
          href="/dashboard/routes/upload"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
        >
          <Upload className="w-8 h-8 text-purple-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">อัพโหลด CSV</span>
        </a>
      </div>

      {/* Simple Summary - รองรับมือถือ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
          <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-4xl sm:text-5xl font-bold text-blue-600 mb-2">
            {totalHouses}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">
            บ้านทั้งหมดในคลัง (ถาวร)
          </p>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
          <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-4xl sm:text-5xl font-bold text-green-600 mb-2">
            {todayHouses}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">
            งานวันนี้ (ชั่วคราว)
          </p>
        </div>
      </div>
    </div>
  );
}
