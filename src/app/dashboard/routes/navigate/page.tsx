"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  user_id?: string;
  house_id?: string;
  full_name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  delivered: boolean;
  delivered_at?: string;
  order_index: number;
  income?: number;
  delivery_notes?: string | null;
  created_at?: string;
  updated_at?: string;
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
  const [tempIncome, setTempIncome] = useState<string>("");
  const [tempNotes, setTempNotes] = useState("");

  // Flag ป้องกัน loop
  const shouldResortRef = useRef(false);
  const isSortingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

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
    toast.innerHTML = `<span class="font-bold">${
      type === "success" ? "สำเร็จ" : type === "error" ? "ผิดพลาด" : "แจ้งเตือน"
    }</span> ${message}`;
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
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
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
    shouldResortRef.current = true;
  };

  // Cache ระยะทาง
  const distanceCache = useMemo(() => new Map<string, number>(), []);
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const key = `${lat1.toFixed(6)},${lng1.toFixed(6)},${lat2.toFixed(6)},${lng2.toFixed(6)}`;
      if (distanceCache.has(key)) return distanceCache.get(key)!;
      const dist = vincentyDistance(lat1, lng1, lat2, lng2);
      distanceCache.set(key, dist);
      return dist;
    },
    [distanceCache],
  );

  // ล้างงานค้างทั้งหมด
  const clearAllPending = async () => {
    if (!confirm("ล้างงานค้างทั้งหมดจริงหรือ? (ไม่สามารถกู้คืนได้)")) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return addToast("กรุณาเข้าสู่ระบบก่อน", "error");

    try {
      const { error } = await supabase
        .from("pending_houses")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setPendingDates([]);
      addToast("ล้างงานค้างทั้งหมดเรียบร้อย!", "success");
    } catch (err: any) {
      addToast(`ล้างไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
    }
  };

  // Refresh data
  const refreshData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let mergedToday: any[] = [];
    try {
      const { data, error } = await supabase.rpc(
        "refresh_and_merge_today_houses",
      );
      if (error) throw error;
      mergedToday = data || [];
      if (mergedToday.length > 0)
        addToast("อัพเดทข้อมูลล่าสุดเรียบร้อย!", "success");

      setHouses(
        mergedToday.map((h: any) => ({
          ...h,
          id: h.id,
          lat: h.lat ? Number(h.lat) : undefined,
          lng: h.lng ? Number(h.lng) : undefined,
          income: h.income ? Number(h.income) : undefined,
          order_index: Number(h.order_index),
        })),
      );
    } catch {
      // Fallback
      try {
        const { data: today } = await supabase
          .from("today_houses")
          .select("*")
          .eq("user_id", user.id);
        const { data: perm } = await supabase.from("houses").select("*");
        const fallbackMerged = (today || [])
          .map((t: any) => {
            const p = perm?.find(
              (p: any) => p.full_name === t.full_name && p.phone === t.phone,
            );
            return {
              ...t,
              lat: t.lat ? Number(t.lat) : p?.lat ? Number(p.lat) : undefined,
              lng: t.lng ? Number(t.lng) : p?.lng ? Number(p.lng) : undefined,
              income: t.income ? Number(t.income) : undefined,
              order_index: Number(t.order_index),
            };
          })
          .sort((a: any, b: any) => a.order_index - b.order_index);
        setHouses(fallbackMerged);
      } catch {}
    }

    // Load pending
    try {
      const { data: pending } = await supabase
        .from("pending_houses")
        .select("original_date")
        .eq("user_id", user.id);
      const map = new Map<string, number>();
      pending?.forEach((r: any) =>
        map.set(r.original_date, (map.get(r.original_date) || 0) + 1),
      );
      const pendingList = Array.from(map.entries())
        .map(([d, c]) => ({ original_date: d, count: c }))
        .sort(
          (a, b) =>
            new Date(b.original_date).getTime() -
            new Date(a.original_date).getTime(),
        );
      setPendingDates(pendingList);
    } catch {}

    shouldResortRef.current = true;
  }, []);

  // เรียงใหม่
  const reSortHouses = useCallback(async () => {
    if (!currentPosition || houses.length === 0 || isSortingRef.current) return;
    const undelivered = houses.filter((h) => !h.delivered);
    if (undelivered.length === 0) return;

    setSorting(true);
    isSortingRef.current = true;

    const pos = currentPosition;
    const withCoords = undelivered.filter((h) => h.lat && h.lng);
    const withoutCoords = undelivered.filter((h) => !h.lat || !h.lng);

    const sortedWith = withCoords
      .map((h) => ({
        h,
        dist: calculateDistance(pos.lat, pos.lng, h.lat!, h.lng!),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map(({ h }, i) => ({ ...h, order_index: i + 1 }));

    const sortedWithout = withoutCoords
      .sort((a, b) => a.order_index - b.order_index)
      .map((h, i) => ({ ...h, order_index: sortedWith.length + i + 1 }));

    const sortedUndelivered = [...sortedWith, ...sortedWithout];
    const deliveredHouses = houses.filter((h) => h.delivered);
    const sortedAll = [...sortedUndelivered, ...deliveredHouses];

    try {
      await Promise.all(
        sortedUndelivered.map((h) =>
          supabase
            .from("today_houses")
            .update({ order_index: h.order_index })
            .eq("id", h.id),
        ),
      );
      setHouses(sortedAll);
    } catch (err: any) {
      addToast(`เรียงลำดับไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
    } finally {
      setSorting(false);
      isSortingRef.current = false;
    }
  }, [currentPosition, houses, calculateDistance]);

  // เปิดเส้นทางทั้งหมด
  const openFullRouteOnMaps = useCallback(async () => {
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
      .map(({ h }, i) => ({ ...h, order_index: i + 1 }));

    try {
      await Promise.all(
        sorted.map((h) =>
          supabase
            .from("today_houses")
            .update({ order_index: h.order_index })
            .eq("id", h.id),
        ),
      );
      setHouses((prev) =>
        prev.map((h) => sorted.find((s) => s.id === h.id) || h),
      );
    } catch {}

    const points = [
      `${currentPosition.lat},${currentPosition.lng}`,
      ...sorted.map((h) => `${h.lat},${h.lng}`),
    ];
    const url = `https://www.google.com/maps/dir/${points.map(encodeURIComponent).join("/")}`;
    addToast(`เปิดเส้นทางแล้ว! ${sorted.length} จุด`, "success");
    window.open(url, "_blank");
  }, [currentPosition, houses, calculateDistance, refreshData]);

  const loadPendingAndResort = useCallback(
    async (original_date: string) => {
      try {
        const { error } = await supabase.rpc("load_pending_to_today", {
          p_original_date: original_date,
        });
        if (error) throw error;
        await refreshData();
        addToast("ดึงงานค้างสำเร็จ!", "success");
        setShowPendingModal(false);
        shouldResortRef.current = true;
      } catch (err: any) {
        addToast(`ดึงงานไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
      }
    },
    [refreshData],
  );

  const archiveTodayData = async () => {
    if (!confirm("เก็บข้อมูลวันนี้และล้างหน้างานทั้งหมดหรือไม่?")) return;
    try {
      const { error } = await supabase.rpc("archive_users_today_houses");
      if (error) throw error;
      addToast("เก็บข้อมูลวันนี้เรียบร้อย!", "success");
      await refreshData();
    } catch (err: any) {
      addToast(`เกิดข้อผิดพลาด: ${err.message || "Unknown"}`, "error");
    }
  };

  const startMarkDelivered = (id: string) => {
    const house = houses.find((h) => h.id === id);
    setTempIncome(house?.income?.toString() || "");
    setTempHouseId(id);
    setTempNotes("");
    setShowDeliveryModal(true);
  };

  const confirmMarkDelivered = async () => {
    if (!tempHouseId || !tempIncome || isNaN(parseFloat(tempIncome))) {
      return addToast("กรุณากรอกรายได้ให้ถูกต้อง", "error");
    }
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("today_houses")
        .update({
          delivered: true,
          delivered_at: now,
          income: parseFloat(tempIncome),
          delivery_notes: tempNotes || null,
          updated_at: now,
        })
        .eq("id", tempHouseId);
      if (error) throw error;

      setHouses((prev) =>
        prev.map((h) =>
          h.id === tempHouseId
            ? {
                ...h,
                delivered: true,
                delivered_at: now,
                income: parseFloat(tempIncome),
                delivery_notes: tempNotes || null,
              }
            : h,
        ),
      );
      setShowDeliveryModal(false);
      addToast("ส่งแล้วและบันทึกสำเร็จ!", "success");
      shouldResortRef.current = true;
    } catch (err: any) {
      addToast(`เกิดข้อผิดพลาด: ${err.message || "Unknown"}`, "error");
    }
  };

  const deleteHouse = async (id: string) => {
    if (!confirm("ลบรายการนี้จริงหรือ?")) return;
    try {
      const { error } = await supabase
        .from("today_houses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("ลบรายการเรียบร้อย", "success");
      shouldResortRef.current = true;
    } catch (err: any) {
      addToast(`ลบไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
    }
  };

  const openMaps = useCallback(
    (lat: number, lng: number) => {
      const origin = currentPosition || DEFAULT_POSITION;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`,
        "_blank",
      );
    },
    [currentPosition],
  );

  // ปุ่มรีเฟรชตำแหน่ง + เรียงใหม่ (สำรอง)
  const forceRefreshLocationAndSort = async () => {
    setSorting(true);
    try {
      const pos = await getCurrentPosition();
      setCurrentPosition(pos);
      shouldResortRef.current = true;
      addToast("รีเฟรชตำแหน่ง + เรียงใหม่แล้ว!", "success");
    } catch {
      addToast("รีเฟรชตำแหน่งไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
    }
  };

  // Init + Auto update position (สำคัญที่สุด!)
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      await refreshData();
      try {
        const pos = await getCurrentPosition();
        if (isMounted) setCurrentPosition(pos);
      } catch {
        if (isMounted) setCurrentPosition(DEFAULT_POSITION);
      }
      if (isMounted) setLoading(false);
      shouldResortRef.current = true;
    };
    init();

    // ติดตามตำแหน่งตลอดเวลา
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCurrentPosition(newPos);
          shouldResortRef.current = true; // บังคับเรียงใหม่ทุกครั้งที่ขยับ
        },
        (err) => console.log("watchPosition error:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    }

    // Fallback ทุก 30 วินาที
    const interval = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        setCurrentPosition(pos);
        shouldResortRef.current = true;
      } catch {}
    }, 30000);

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      clearInterval(interval);
    };
  }, [refreshData]);

  // Auto re-sort เมื่อ flag ถูกตั้ง
  useEffect(() => {
    if (
      shouldResortRef.current &&
      currentPosition &&
      houses.length > 0 &&
      !loading &&
      !sorting
    ) {
      shouldResortRef.current = false;
      const timer = setTimeout(reSortHouses, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPosition, houses.length, loading, sorting, reSortHouses]);

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
            new Date(b.delivered_at || "").getTime() -
            new Date(a.delivered_at || "").getTime(),
        ),
    [houses],
  );
  const totalPending = useMemo(
    () => pendingDates.reduce((sum, item) => sum + item.count, 0),
    [pendingDates],
  );

  const isUsingDefault =
    !currentPosition ||
    (Math.abs(currentPosition.lat - DEFAULT_POSITION.lat) < 0.001 &&
      Math.abs(currentPosition.lng - DEFAULT_POSITION.lng) < 0.001);

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
                <h1 className="text-2xl font-bold text-gray-900">
                  นำทางวันนี้
                </h1>
                <p className="text-sm text-gray-600">
                  {activeTab === "undelivered"
                    ? undelivered.length
                    : delivered.length}{" "}
                  รายการ
                  {totalPending > 0 && (
                    <>
                      <button
                        onClick={() => setShowPendingModal(true)}
                        className="ml-3 text-blue-600 underline font-medium"
                      >
                        ดึงงานค้างอีก {totalPending} รายการ
                      </button>
                      <button
                        onClick={clearAllPending}
                        className="ml-3 text-red-600 underline font-medium"
                      >
                        ล้างงานค้างทั้งหมด
                      </button>
                    </>
                  )}
                </p>
              </div>
              {/* ปุ่มรีเฟรชตำแหน่งสำรอง */}
              <button
                onClick={forceRefreshLocationAndSort}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold"
              >
                <RefreshCw
                  className={`w-4 h-4 ${sorting ? "animate-spin" : ""}`}
                />
                รีเฟรชตำแหน่ง
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={openFullRouteOnMaps}
                className="flex items-center gap-2 px-5 py-3 bg-linear-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl shadow-md"
              >
                <MapIcon className="w-5 h-5" /> เส้นทางทั้งหมด
              </button>
              <button
                onClick={archiveTodayData}
                className="flex items-center gap-2 px-5 py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-md"
              >
                <Save className="w-5 h-5" /> เก็บข้อมูลวันนี้
              </button>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1 text-sm font-medium text-gray-800">
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

        {/* แจ้งเตือนใช้ตำแหน่งชั่วคราว */}
        {isUsingDefault && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex justify-between items-center">
              <span>กำลังใช้ตำแหน่งชั่วคราว (กำลังรอ GPS)</span>
              <button
                onClick={() => setShowManualModal(true)}
                className="underline font-medium"
              >
                ตั้งค่าตำแหน่ง
              </button>
            </div>
          </div>
        )}

        {/* รายการบ้าน */}
        <div className="max-w-7xl mx-auto px-4 py-6 text-gray-800">
          {houses.length === 0 ? (
            <div className="text-center py-16">
              <MapIcon className="w-20 h-20 mx-auto text-blue-600 mb-6" />
              <h2 className="text-2xl font-bold">ยังไม่มีงานวันนี้</h2>
              {totalPending > 0 && (
                <button
                  onClick={() => setShowPendingModal(true)}
                  className="mt-6 px-8 py-4 bg-linear-to-r from-blue-600 to-indigo-700 text-white text-xl font-bold rounded-2xl"
                >
                  ดึงงานค้าง {totalPending} รายการ
                </button>
              )}
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
                      {/* เปลี่ยนจากเดิมทั้งหมด เป็นอันนี้ */}
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={() => deleteHouse(house.id)}
                          className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 active:scale-95 transition-all opacity-90 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl font-bold text-indigo-600">
                            #{house.order_index}
                          </span>
                          {house.delivered && (
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                              ส่งแล้ว
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {house.full_name}
                        </h3>
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
                      </div>

                      <div className="px-5 pb-5">
                        {house.lat && house.lng ? (
                          <button
                            onClick={() => openMaps(house.lat!, house.lng!)}
                            className="w-full py-3 text-sm font-bold text-white bg-linear-to-r from-emerald-600 to-green-600 rounded-xl flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-5 h-5" /> นำทาง
                          </button>
                        ) : (
                          <div className="w-full py-3 text-center text-sm font-medium text-gray-500 bg-gray-100 rounded-xl">
                            ไม่มีพิกัด
                          </div>
                        )}
                        {!house.delivered && (
                          <button
                            onClick={() => startMarkDelivered(house.id)}
                            className="w-full mt-3 py-3 text-sm font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl"
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
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-gray-800">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตั้งค่าตำแหน่งปัจจุบัน</h2>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={detectLocation}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 mb-4 transition"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับ GPS อัตโนมัติ
              </button>
              <input
                type="text"
                placeholder="16.8833,99.125"
                value={manualCoordInput}
                onChange={(e) => {
                  setManualCoordInput(e.target.value);
                  const parts = e.target.value.split(",");
                  if (parts.length === 2) {
                    const lat = parseFloat(parts[0].trim());
                    const lng = parseFloat(parts[1].trim());
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setDetectedLat(lat);
                      setDetectedLng(lng);
                    }
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              <button
                onClick={setManualPosition}
                disabled={!detectedLat || !detectedLng}
                className="w-full mt-5 py-3.5 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-600 disabled:opacity-50 transition"
              >
                บันทึกและเรียงใหม่
              </button>
            </div>
          </div>
        )}
        {/* Modal ดึงงานค้าง */}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto text-gray-800">
              <div className="flex justify-between items-center mb-5 sticky top-0 bg-white">
                <h2 className="text-xl font-bold">
                  ดึงงานค้าง ({totalPending} รายการ)
                </h2>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {pendingDates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">ไม่มีงานค้าง</p>
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
                      className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
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
        {showDeliveryModal && tempHouseId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-gray-800">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:border-blue-500 focus:ring focus:ring-blue-200"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl font-medium hover:bg-gray-300 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmMarkDelivered}
                  disabled={!tempIncome || isNaN(parseFloat(tempIncome))}
                  className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 transition"
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
