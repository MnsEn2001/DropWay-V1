// src/app/dashboard/routes/income/page.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
  Edit3,
  Search,
} from "lucide-react";

interface DeliveredHouse {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  delivered: boolean;
  delivered_at: string;
  income?: number;
  delivery_notes?: string;
  user_id: string;
  table_source: "today" | "archived";
}

interface IncomeEntry {
  date: string;
  dateLabel: string;
  count: number;
  totalIncome: number;
}

interface UnfilledDay {
  date: string;
  dateLabel: string;
  count: number;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

export default function IncomePage() {
  const [deliveredHouses, setDeliveredHouses] = useState<DeliveredHouse[]>([]);
  const [unfilledDays, setUnfilledDays] = useState<UnfilledDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");
  const [dailyIncome, setDailyIncome] = useState<IncomeEntry[]>([]);
  const [weeklyIncome, setWeeklyIncome] = useState<IncomeEntry[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<IncomeEntry[]>([]);
  const [yearlyIncome, setYearlyIncome] = useState<IncomeEntry[]>([]);
  const [showUnfilledModal, setShowUnfilledModal] = useState(false);
  const [selectedDayHouses, setSelectedDayHouses] = useState<DeliveredHouse[]>(
    [],
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
  const [currentIncome, setCurrentIncome] = useState<number | null>(null);
  const [currentNotes, setCurrentNotes] = useState("");

  const addToast = (message: string, type: "success" | "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

        const [todayRes, archivedRes] = await Promise.all([
          supabase.from("today_houses").select("*").eq("delivered", true),
          supabase
            .from("archived_delivered_houses")
            .select("*")
            .eq("delivered", true),
        ]);

        if (todayRes.error) throw todayRes.error;
        if (archivedRes.error) throw archivedRes.error;

        const combined: DeliveredHouse[] = [
          ...(todayRes.data || []).map((h: any) => ({
            ...h,
            table_source: "today" as const,
          })),
          ...(archivedRes.data || []).map((h: any) => ({
            ...h,
            table_source: "archived" as const,
          })),
        ];

        setDeliveredHouses(combined);
        computeIncomes(combined);
        loadUnfilledDays(combined);
      } catch (err: any) {
        addToast("โหลดข้อมูลไม่สำเร็จ", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const computeIncomes = (houses: DeliveredHouse[]) => {
    const now = new Date();

    // Daily - 30 วันล่าสุด
    const daily: IncomeEntry[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayHouses = houses.filter(
        (h) => new Date(h.delivered_at).toISOString().split("T")[0] === dateStr,
      );
      daily.push({
        date: dateStr,
        dateLabel: date.toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        count: dayHouses.length,
        totalIncome: dayHouses.reduce((s, h) => s + (h.income || 0), 0),
      });
    }
    setDailyIncome(daily);

    // Weekly, Monthly, Yearly (เหมือนเดิมทุกอย่าง)
    // ... (ไม่ต้องแก้)
    const weekly: IncomeEntry[] = [];
    for (let i = 11; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const weekHouses = houses.filter((h) => {
        const d = new Date(h.delivered_at);
        return d >= start && d <= end;
      });
      weekly.push({
        date: `${start.toISOString().split("T")[0]}_to_${end.toISOString().split("T")[0]}`,
        dateLabel: `${start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`,
        count: weekHouses.length,
        totalIncome: weekHouses.reduce((s, h) => s + (h.income || 0), 0),
      });
    }
    setWeeklyIncome(weekly);

    const monthly: IncomeEntry[] = [];
    const year = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      const monthHouses = houses.filter((h) => {
        const d = new Date(h.delivered_at);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const monthStart = new Date(year, m, 1);
      monthly.push({
        date: `${year}-${String(m + 1).padStart(2, "0")}`,
        dateLabel: monthStart.toLocaleDateString("th-TH", {
          month: "long",
          year: "numeric",
        }),
        count: monthHouses.length,
        totalIncome: monthHouses.reduce((s, h) => s + (h.income || 0), 0),
      });
    }
    setMonthlyIncome(monthly);

    const yearly: IncomeEntry[] = [];
    for (let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) {
      const yearHouses = houses.filter(
        (h) => new Date(h.delivered_at).getFullYear() === y,
      );
      yearly.push({
        date: y.toString(),
        dateLabel: y.toString(),
        count: yearHouses.length,
        totalIncome: yearHouses.reduce((s, h) => s + (h.income || 0), 0),
      });
    }
    setYearlyIncome(yearly);
  };

  const loadUnfilledDays = (houses: DeliveredHouse[]) => {
    const map = new Map<string, { count: number; label: string }>();
    houses
      .filter((h) => !h.income || h.income === 0)
      .forEach((h) => {
        const dateStr = new Date(h.delivered_at).toISOString().split("T")[0];
        const label = new Date(dateStr).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        if (!map.has(dateStr)) map.set(dateStr, { count: 0, label });
        map.get(dateStr)!.count += 1;
      });

    const list = Array.from(map.entries())
      .map(([date, { count, label }]) => ({ date, dateLabel: label, count }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setUnfilledDays(list);
  };

  const getIncomeEntries = () => {
    switch (activeTab) {
      case "daily":
        return dailyIncome;
      case "weekly":
        return weeklyIncome;
      case "monthly":
        return monthlyIncome;
      case "yearly":
        return yearlyIncome;
      default:
        return [];
    }
  };

  const handleLoadUnfilled = () => setShowUnfilledModal(true);

  const handleSelectDay = (date: string) => {
    const dayHouses = deliveredHouses.filter(
      (h) =>
        new Date(h.delivered_at).toISOString().split("T")[0] === date &&
        (!h.income || h.income === 0),
    );
    setSelectedDayHouses(dayHouses);
    setShowUnfilledModal(false);
    setShowEditModal(true);
  };

  const openEditModal = (house: DeliveredHouse) => {
    setCurrentEditingId(house.id);
    setCurrentIncome(house.income || null);
    setCurrentNotes(house.delivery_notes || "");
    setShowEditModal(true);
  };

  const saveDetails = async () => {
    if (!currentEditingId) return;

    try {
      const house = deliveredHouses.find((h) => h.id === currentEditingId);
      if (!house) return addToast("ไม่พบรายการนี้", "error");

      const tableName =
        house.table_source === "today"
          ? "today_houses"
          : "archived_delivered_houses";

      const { error } = await supabase
        .from(tableName)
        .update({
          income: currentIncome || null,
          delivery_notes: currentNotes.trim() || null,
        })
        .eq("id", currentEditingId);

      if (error) throw error;

      const updatedHouses = deliveredHouses.map((h) =>
        h.id === currentEditingId
          ? {
              ...h,
              income: currentIncome || undefined,
              delivery_notes: currentNotes.trim() || undefined,
            }
          : h,
      );

      setDeliveredHouses(updatedHouses);
      computeIncomes(updatedHouses);
      loadUnfilledDays(updatedHouses);

      setShowEditModal(false);
      setCurrentEditingId(null);
      setCurrentIncome(null);
      setCurrentNotes("");
      addToast("บันทึกรายได้สำเร็จ!", "success");
    } catch (err: any) {
      addToast("บันทึกไม่สำเร็จ: " + (err.message || ""), "error");
    }
  };

  const entries = getIncomeEntries();
  const totalIncome = entries.reduce((s, e) => s + e.totalIncome, 0);
  const totalCount = entries.reduce((s, e) => s + e.count, 0);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" /> กำลังโหลด...
      </div>
    );
  if (deliveredHouses.length === 0)
    return (
      <div className="p-8 text-center text-gray-500">
        ยังไม่มีข้อมูลการส่งของ
      </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">คำนวณรายได้</h1>
        <p className="text-gray-600">สรุปรายได้จากการส่งของตามช่วงเวลา</p>
      </div>

      <div className="mb-6">
        <button
          onClick={handleLoadUnfilled}
          disabled={unfilledDays.length === 0}
          className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition"
        >
          <Search className="w-5 h-5" />
          {unfilledDays.length > 0
            ? `กรอกรายได้ที่ยังไม่เสร็จ (${unfilledDays.reduce((s, d) => s + d.count, 0)} รายการ)`
            : "ไม่มีรายการที่ต้องกรอก"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-600" />
          สรุปช่วงที่เลือก ({entries.length} รายการ)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-blue-600">
              {totalCount.toLocaleString()}
            </p>
            <p className="text-blue-700 mt-1">รายการส่งทั้งหมด</p>
          </div>
          <div className="bg-green-50 rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-green-600">
              {totalIncome.toLocaleString()} บาท
            </p>
            <p className="text-green-700 mt-1">รายได้รวม</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "daily" && "รายวัน"}
              {tab === "weekly" && "รายสัปดาห์"}
              {tab === "monthly" && "รายเดือน"}
              {tab === "yearly" && "รายปี"}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                วันที่/ช่วง
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                จำนวน
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">
                รายได้ (บาท)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((e, i) => (
              <tr
                key={e.date}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {e.dateLabel}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {e.count.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">
                  {e.totalIncome.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal 1: วันที่ยังไม่กรอกรายได้ */}
      {showUnfilledModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">วันที่ยังไม่กรอกรายได้</h2>
            {unfilledDays.length > 0 ? (
              <div className="space-y-3">
                {unfilledDays.map((day) => (
                  <div
                    key={day.date}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{day.dateLabel}</span>
                    <button
                      onClick={() => handleSelectDay(day.date)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                    >
                      กรอก ({day.count})
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                ไม่มีรายการที่ต้องกรอก
              </p>
            )}
            <button
              onClick={() => setShowUnfilledModal(false)}
              className="mt-6 w-full bg-gray-300 py-3 rounded-xl hover:bg-gray-400 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: รายการของวันนั้น */}
      {showEditModal && selectedDayHouses.length > 0 && !currentEditingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              กรอกรายได้ ({selectedDayHouses.length} รายการ)
            </h2>
            <div className="space-y-4">
              {selectedDayHouses.map((house) => (
                <div key={house.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{house.full_name}</p>
                      <p className="text-sm text-gray-600">{house.phone}</p>
                      <p className="text-sm text-gray-500">{house.address}</p>
                      {house.table_source === "archived" && (
                        <span className="text-xs text-orange-600">
                          (ข้อมูลเก่า)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openEditModal(house)}
                      className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                    >
                      <Edit3 className="w-4 h-4" /> กรอก
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedDayHouses([]);
              }}
              className="mt-6 w-full bg-gray-300 py-3 rounded-xl hover:bg-gray-400"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: กรอกรายละเอียดรายการเดียว */}
      {showEditModal && currentEditingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">กรอกรายได้และหมายเหตุ</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  รายได้ (บาท)
                </label>
                <input
                  type="number"
                  value={currentIncome || ""}
                  onChange={(e) =>
                    setCurrentIncome(parseFloat(e.target.value) || null)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="เช่น 150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  หมายเหตุ
                </label>
                <textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 resize-none"
                  placeholder="เช่น จ่ายเงินสด, ลูกค้าขอส่วนลด..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentEditingId(null);
                    setCurrentIncome(null);
                    setCurrentNotes("");
                  }}
                  className="flex-1 bg-gray-300 py-3 rounded-xl hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveDetails}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-bold"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-4 rounded-xl shadow-2xl text-white ${
              t.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
            <span className="font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
