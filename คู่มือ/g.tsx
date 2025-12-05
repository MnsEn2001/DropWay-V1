"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Navigation,
  RefreshCw,
  MapPin,
  Loader2,
  X,
  Trash2,
  Save,
  Route as MapIcon,
} from "lucide-react";
interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  delivered: boolean;
  delivered_at?: string;
  order_index: number;
  income?: number;
  delivery_notes?: string;
  houses_updated_at?: string; // เพิ่มเพื่อเปรียบเทียบ
}
const DEFAULT_POSITION = { lat: 16.8833, lng: 99.125 };
function vincentyDistance(
  φ1: number,
  λ1: number,
  φ2: number,
  λ2: number,
): number {
  const a = 6378137,
    b = 6356752.3142,
    f = 1 / 298.257223563;
  const L = ((λ2 - λ1) * Math.PI) / 180;
  const tanU1 = (1 - f) * Math.tan((φ1 * Math.PI) / 180),
    cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
    sinU1 = tanU1 * cosU1;
  const tanU2 = (1 - f) * Math.tan((φ2 * Math.PI) / 180),
    cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2),
    sinU2 = tanU2 * cosU2;
  let λ = L,
    λʹ;
  let sinλ, cosλ, sinσ, cosσ, σ, sinα, cosSqα, cos2σₘ, C;
  do {
    sinλ = Math.sin(λ);
    cosλ = Math.cos(λ);
    const sinSqσ =
      (cosU2 * sinλ) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) ** 2;
    if (sinSqσ === 0) return 0;
    sinσ = Math.sqrt(sinSqσ);
    cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
    σ = Math.atan2(sinσ, cosσ);
    sinα = (cosU1 * cosU2 * sinλ) / sinσ;
    cosSqα = 1 - sinα * sinα;
    cos2σₘ = cosσ - (2 * sinU1 * sinU2) / cosSqα;
    C = (f / 16) * cosSqα * (4 + f * (4 - 3 * cosSqα));
    λʹ = λ;
    λ =
      L +
      (1 - C) *
        f *
        sinα *
        (σ + C * sinσ * (cos2σₘ + C * cosσ * (-1 + 2 * cos2σₘ * cos2σₘ)));
  } while (Math.abs(λ - λʹ) > 1e-12);
  const uSq = (cosSqα * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const Δσ =
    B *
    sinσ *
    (cos2σₘ +
      (B / 4) *
        (cosσ * (-1 + 2 * cos2σₘ * cos2σₘ) -
          (B / 6) *
            cos2σₘ *
            (-3 + 4 * sinσ * sinσ) *
            (-3 + 4 * cos2σₘ * cos2σₘ)));
  return (b * A * (σ - Δσ)) / 1000;
}
export default function NavigatePage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [pendingDates, setPendingDates] = useState<
    { original_date: string; count: number }[]
  >([]);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sorting, setSorting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"undelivered" | "delivered">(
    "undelivered",
  );
  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [manualCoordInput, setManualCoordInput] = useState("");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  // สำหรับกด "ส่งแล้ว"
  const [tempHouseId, setTempHouseId] = useState<string | null>(null);
  const [tempIncome, setTempIncome] = useState("");
  const [tempNotes, setTempNotes] = useState("");
  // Toast
  const addToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-in slide-in-from-top ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
          ? "bg-red-600"
          : "bg-blue-600"
    }`;
    toast.innerHTML = `<span class="font-bold">${type === "success" ? "สำเร็จ" : type === "error" ? "ผิดพลาด" : "แจ้ง"}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };
  const getCurrentPosition = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("ไม่รองรับ Geolocation"));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  const detectLocation = async () => {
    try {
      const pos = await getCurrentPosition();
      setDetectedLat(pos.lat);
      setDetectedLng(pos.lng);
      setManualCoordInput(`${pos.lat},${pos.lng}`);
      addToast("ตรวจจับตำแหน่งสำเร็จ", "success");
    } catch {
      addToast("ไม่สามารถหาตำแหน่งได้", "error");
    }
  };
  const setManualPosition = () => {
    if (!detectedLat || !detectedLng)
      return addToast("พิกัดไม่ถูกต้อง", "error");
    setCurrentPosition({ lat: detectedLat, lng: detectedLng });
    setShowManualModal(false);
    addToast("ตั้งค่าตำแหน่งแล้ว → กำลังเรียงใหม่...", "success");
    refreshAndResort();
  };
  // Cache ระยะทาง
  const distanceCache = useMemo(() => new Map<string, number>(), []);
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const key = `${lat1},${lng1},${lat2},${lng2}`;
      if (distanceCache.has(key)) return distanceCache.get(key)!;
      const dist = vincentyDistance(lat1, lng1, lat2, lng2);
      distanceCache.set(key, dist);
      return dist;
    },
    [distanceCache],
  );
  // ฟังก์ชันหลัก: ดึงข้อมูล + อัพเดทพิกัดจาก houses + เรียงใหม่
  const refreshAndResort = useCallback(async () => {
    await refreshData(); // มีการอัพเดทพิกัดจาก houses แล้ว
    if (!currentPosition || houses.length === 0) return;
    reSortHouses();
  }, [currentPosition, houses]);
  const reSortHouses = useCallback(async () => {
    if (!currentPosition || houses.length === 0) return;
    const undelivered = houses.filter((h) => !h.delivered);
    if (undelivered.length === 0) return;
    setSorting(true);
    const withCoords = undelivered.filter((h) => h.lat && h.lng);
    const withoutCoords = undelivered.filter((h) => !h.lat || !h.lng);
    const sortedWith = withCoords
      .map((h) => ({
        h,
        dist: calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          h.lat!,
          h.lng!,
        ),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map(({ h }, i) => ({ ...h, order_index: i + 1 }));
    const sortedWithout = withoutCoords
      .sort((a, b) => a.order_index - b.order_index)
      .map((h, i) => ({ ...h, order_index: sortedWith.length + i + 1 }));
    const sorted = [...sortedWith, ...sortedWithout];
    try {
      const updates = sorted.map((h) =>
        supabase
          .from("today_houses")
          .update({ order_index: h.order_index })
          .eq("id", h.id),
      );
      await Promise.all(updates);
      setHouses((prev) =>
        prev.map((h) => sorted.find((s) => s.id === h.id) || h),
      );
      addToast("เรียงเส้นทางอัตโนมัติเรียบร้อย", "success");
    } catch (err) {
      addToast("เรียงลำดับไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
    }
  }, [houses, currentPosition, calculateDistance]);
  const openFullRouteOnMaps = async () => {
    if (!currentPosition) return addToast("ยังไม่มีตำแหน่งปัจจุบัน", "error");
    await refreshData();
    const validHouses = houses.filter((h) => !h.delivered && h.lat && h.lng);
    if (validHouses.length === 0)
      return addToast("ไม่มีจุดหมายที่มีพิกัด", "error");
    const sorted = validHouses
      .map((h) => ({
        h,
        dist: calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          h.lat!,
          h.lng!,
        ),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map((x) => x.h);
    try {
      await Promise.all(
        sorted.map((h, i) =>
          supabase
            .from("today_houses")
            .update({ order_index: i + 1 })
            .eq("id", h.id),
        ),
      );
      setHouses((prev) =>
        prev.map((h) => ({
          ...h,
          order_index: sorted.findIndex((s) => s.id === h.id) + 1,
        })),
      );
    } catch (err) {
      console.error("อัพเดท order_index ล้มเหลว", err);
    }
    const points = [
      `${currentPosition.lat},${currentPosition.lng}`,
      ...sorted.map((h) => `${h.lat},${h.lng}`),
    ];
    const url = `https://www.google.com/maps/dir/${points.map(encodeURIComponent).join("/")}`;
    addToast(
      `เปิดเส้นทางแล้ว! เดินตามลำดับ 1 → 2 → ... → ${sorted.length} เป๊ะ ๆ`,
      "success",
    );
    window.open(url, "_blank");
  };
  const archiveTodayData = async () => {
    if (!confirm("เก็บข้อมูลวันนี้และล้างหน้างานทั้งหมดหรือไม่?")) return;
    const { error } = await supabase.rpc("archive_users_today_houses");
    if (error) {
      addToast("เกิดข้อผิดพลาด: " + error.message, "error");
    } else {
      addToast("เก็บข้อมูลวันนี้เรียบร้อย!", "success");
      await refreshData();
      setTimeout(() => reSortHouses(), 300);
    }
  };
  const startMarkDelivered = (id: string) => {
    setTempHouseId(id);
    setTempIncome("");
    setTempNotes("");
    setShowDeliveryModal(true);
  };
  const confirmMarkDelivered = async () => {
    if (!tempHouseId || !tempIncome || isNaN(parseFloat(tempIncome))) {
      addToast("กรุณากรอกรายได้ให้ถูกต้อง", "error");
      return;
    }
    const { error } = await supabase
      .from("today_houses")
      .update({
        delivered: true,
        delivered_at: new Date().toISOString(),
        income: parseFloat(tempIncome),
        delivery_notes: tempNotes || null,
      })
      .eq("id", tempHouseId);
    if (error) {
      addToast("เกิดข้อผิดพลาด: " + error.message, "error");
    } else {
      await refreshAndResort();
      setShowDeliveryModal(false);
      addToast("ส่งแล้วและบันทึกสำเร็จ!", "success");
    }
  };
  const deleteHouse = async (id: string) => {
    if (!confirm("ลบรายการนี้จริงหรือ? (ไม่สามารถกู้คืนได้)")) return;
    try {
      const { error } = await supabase
        .from("today_houses")
        .delete()
        .eq("id", id)
        .throwOnError();
      addToast("ลบรายการเรียบร้อยแล้ว", "success");
      await refreshAndResort();
    } catch (err: any) {
      console.error("ลบไม่สำเร็จ:", err);
      const msg =
        err?.message ||
        err?.hint ||
        err?.details ||
        "ไม่สามารถลบได้ (อาจถูก RLS บล็อก หรือไม่มีสิทธิ์)";
      addToast(`ลบไม่สำเร็จ: ${msg}`, "error");
    }
  };
  const openMaps = (lat: number, lng: number) => {
    const o = currentPosition || DEFAULT_POSITION;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };
  // ฟังก์ชันหลักที่อัพเดทจาก houses ด้วย
  const refreshData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: today }, { data: perm }, { data: pending }] =
      await Promise.all([
        supabase.from("today_houses").select("*").order("order_index"),
        supabase.from("houses").select("*"),
        supabase
          .from("pending_houses")
          .select("original_date")
          .eq("user_id", user.id),
      ]);
    // สร้าง map ของ houses ล่าสุด (key = full_name + phone)
    const housesMap = new Map<string, any>();
    perm?.forEach((h: any) => {
      const key = `${h.full_name}|${h.phone}`;
      housesMap.set(key, h);
    });
    // อัพเดท today_houses ถ้ามีการเปลี่ยนแปลง
    const updates: Promise<any>[] = [];
    let hasUpdate = false;
    const merged = (today || []).map((t: any) => {
      const key = `${t.full_name}|${t.phone}`;
      const latest = housesMap.get(key);
      if (latest) {
        const latestUpdated = new Date(latest.updated_at).getTime();
        const currentUpdated = t.houses_updated_at
          ? new Date(t.houses_updated_at).getTime()
          : 0;
        if (latestUpdated > currentUpdated) {
          hasUpdate = true;
          updates.push(
            supabase
              .from("today_houses")
              .update({
                lat: latest.lat || null,
                lng: latest.lng || null,
                address: latest.address,
                houses_updated_at: latest.updated_at,
              })
              .eq("id", t.id),
          );
        }
        return {
          ...t,
          lat: latest.lat || t.lat,
          lng: latest.lng || t.lng,
          address: latest.address || t.address,
        };
      }
      return t;
    });
    if (hasUpdate && updates.length > 0) {
      await Promise.all(updates);
      addToast("อัพเดทพิกัดล่าสุดจากฐานข้อมูลหลักแล้ว!", "success");
    }
    setHouses(merged);
    const map = new Map<string, number>();
    pending?.forEach((r: any) =>
      map.set(r.original_date, (map.get(r.original_date) || 0) + 1),
    );
    setPendingDates(
      Array.from(map.entries()).map(([d, c]) => ({
        original_date: d,
        count: c,
      })),
    );
  }, []);
  const loadPendingAndResort = async (original_date: string) => {
    const { error } = await supabase.rpc("load_pending_to_today", {
      p_original_date: original_date,
    });
    if (error) {
      addToast("ดึงงานไม่สำเร็จ: " + error.message, "error");
    } else {
      await refreshAndResort();
      addToast(
        `ดึงงานวันที่ ${new Date(original_date).toLocaleDateString("th-TH")} สำเร็จ!`,
        "success",
      );
      setShowPendingModal(false);
    }
  };
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isMounted) return;
      setLoading(true);
      await refreshData();
      try {
        const pos = await getCurrentPosition();
        if (isMounted) {
          setCurrentPosition(pos);
          setTimeout(() => reSortHouses(), 500);
        }
      } catch {
        if (isMounted) {
          setCurrentPosition(DEFAULT_POSITION);
          setTimeout(() => reSortHouses(), 500);
        }
      }
      if (isMounted) setLoading(false);
    };
    init();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && isMounted)
        init();
    });
    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshData]);
  const undelivered = useMemo(
    () =>
      houses
        .filter((h) => !h.delivered)
        .sort((a, b) => a.order_index - b.order_index),
    [houses],
  );
  const delivered = useMemo(
    () =>
      houses
        .filter((h) => h.delivered)
        .sort(
          (a, b) =>
            new Date(b.delivered_at || 0).getTime() -
            new Date(a.delivered_at || 0).getTime(),
        ),
    [houses],
  );
  const totalPending = pendingDates.reduce((sum, item) => sum + item.count, 0);
  const isUsingDefault =
    !currentPosition ||
    (currentPosition.lat === DEFAULT_POSITION.lat &&
      currentPosition.lng === DEFAULT_POSITION.lng);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-32">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-40">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">นำทางวันนี้</h1>
                <p className="text-sm text-gray-600">
                  {activeTab === "undelivered"
                    ? undelivered.length
                    : delivered.length}{" "}
                  รายการ
                  {totalPending > 0 && (
                    <button
                      onClick={() => setShowPendingModal(true)}
                      className="ml-3 text-blue-600 underline font-medium"
                    >
                      ดึงงานค้างอีก {totalPending} รายการ
                    </button>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={refreshAndResort} // เปลี่ยนเป็นฟังก์ชันใหม่
                disabled={sorting}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-70"
              >
                {sorting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                เรียงใหม่
              </button>
              <button
                onClick={openFullRouteOnMaps}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg"
              >
                <MapIcon className="w-5 h-5" /> เส้นทางทั้งหมด
              </button>
              <button
                onClick={archiveTodayData}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg"
              >
                <Save className="w-5 h-5" /> เก็บข้อมูลวันนี้
              </button>
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1 mt-4 text-sm font-medium">
              <button
                onClick={() => setActiveTab("undelivered")}
                className={`flex-1 py-3 rounded-lg ${activeTab === "undelivered" ? "bg-white shadow-sm" : ""}`}
              >
                ยังไม่ส่ง ({undelivered.length})
              </button>
              <button
                onClick={() => setActiveTab("delivered")}
                className={`flex-1 py-3 rounded-lg ${activeTab === "delivered" ? "bg-white shadow-sm" : ""}`}
              >
                ส่งแล้ว ({delivered.length})
              </button>
            </div>
          </div>
        </div>
        {isUsingDefault && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex justify-between items-center">
              <span>ใช้จุดเริ่มต้นชั่วคราว (ตาก)</span>
              <button
                onClick={() => setShowManualModal(true)}
                className="underline font-medium"
              >
                ตั้งค่าตำแหน่ง
              </button>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {houses.length === 0 ? (
            <div className="py-16 text-center">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-12 max-w-2xl mx-auto shadow-xl">
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto mb-6 bg-blue-200 rounded-full flex items-center justify-center">
                    <MapIcon className="w-12 h-12 text-blue-700" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    ยังไม่มีงานส่งของวันนี้
                  </h2>
                  <p className="text-lg text-gray-700">
                    {totalPending > 0
                      ? `พบงานค้างทั้งหมด ${totalPending} รายการ`
                      : "ไม่มีงานค้างอยู่ในระบบ"}
                  </p>
                </div>
                {totalPending > 0 && (
                  <button
                    onClick={() => setShowPendingModal(true)}
                    className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl active:scale-95 transition-all transform hover:-translate-y-1"
                  >
                    ดึงงานค้างมาใช้เลย
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {(activeTab === "undelivered" ? undelivered : delivered).map(
                (house) => {
                  const distance =
                    house.lat && house.lng
                      ? calculateDistance(
                          (currentPosition || DEFAULT_POSITION).lat,
                          (currentPosition || DEFAULT_POSITION).lng,
                          house.lat,
                          house.lng,
                        )
                      : null;
                  return (
                    <div
                      key={house.id}
                      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 transition-all overflow-hidden"
                    >
                      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                        <span className="text-2xl font-bold text-indigo-600">
                          #{house.order_index}
                        </span>
                        {!house.delivered && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const btn = e.currentTarget;
                              btn.disabled = true;
                              await deleteHouse(house.id);
                              btn.disabled = false;
                            }}
                            className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 hover:scale-110 transition-all opacity-80 hover:opacity-100 disabled:opacity-50"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        )}
                        {house.delivered && (
                          <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
                            ส่งแล้ว
                          </span>
                        )}
                      </div>
                      <div className="px-5 pb-5">
                        <h3 className="font-bold text-lg">{house.full_name}</h3>
                        <p className="text-sm text-gray-600">{house.phone}</p>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {house.address}
                        </p>
                        <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                          {distance !== null && (
                            <span>{distance.toFixed(1)} กม.</span>
                          )}
                          {house.income && (
                            <span className="font-bold text-green-600">
                              {house.income.toLocaleString()} ฿
                            </span>
                          )}
                        </div>
                        {house.lat && house.lng ? (
                          <button
                            onClick={() => openMaps(house.lat!, house.lng!)}
                            className="w-full mt-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition"
                          >
                            <Navigation className="w-5 h-5" /> นำทาง
                          </button>
                        ) : (
                          <div className="w-full mt-5 py-3 text-center text-sm font-medium text-gray-500 bg-gray-100 rounded-xl">
                            ไม่มีพิกัด
                          </div>
                        )}
                        {!house.delivered && (
                          <button
                            onClick={() => startMarkDelivered(house.id)}
                            className="w-full mt-3 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg transition"
                          >
                            ส่งแล้ว
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
        <div
          id="toast-container"
          className="fixed top-16 right-4 z-50 space-y-3"
        />
        {/* Modal ตั้งค่าตำแหน่ง */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตั้งค่าตำแหน่งปัจจุบัน</h2>
                <button onClick={() => setShowManualModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={detectLocation}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 mb-4"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับ GPS อัตโนมัติ
              </button>
              <input
                type="text"
                placeholder="16.8833,99.125"
                value={manualCoordInput}
                onChange={(e) => {
                  setManualCoordInput(e.target.value);
                  const [lat, lng] = e.target.value.split(",").map(parseFloat);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setDetectedLat(lat);
                    setDetectedLng(lng);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center font-mono"
              />
              <button
                onClick={setManualPosition}
                disabled={!detectedLat}
                className="w-full mt-5 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50"
              >
                บันทึกและเรียงใหม่
              </button>
            </div>
          </div>
        )}
        {/* Modal ดึงงานค้าง */}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              key={pendingDates.length}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">
                  ดึงงานค้าง ({totalPending} รายการ)
                </h2>
                <button onClick={() => setShowPendingModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              {pendingDates.length === 0 ? (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-blue-600 mb-3" />
                  <p className="text-gray-600">กำลังโหลดงานค้าง...</p>
                </div>
              ) : (
                pendingDates.map((pd) => (
                  <div
                    key={pd.original_date}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-xl mb-3 hover:bg-gray-100 transition"
                  >
                    <div>
                      <p className="font-bold">
                        {new Date(pd.original_date).toLocaleDateString(
                          "th-TH",
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{pd.count} รายการ</p>
                    </div>
                    <button
                      onClick={() => loadPendingAndResort(pd.original_date)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg active:scale-95 transition"
                    >
                      ดึงมาใช้
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* Modal บันทึกรายได้ */}
        {showDeliveryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold mb-5">บันทึกรายได้การส่ง</h2>
              <input
                type="number"
                placeholder="รายได้ (บาท) *บังคับ"
                value={tempIncome}
                onChange={(e) => setTempIncome(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:border-blue-500 focus:ring focus:ring-blue-200"
                autoFocus
              />
              <textarea
                placeholder="หมายเหตุ (ไม่บังคับ)"
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl font-medium hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmMarkDelivered}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold"
                >
                  ยืนยันส่งแล้ว
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
