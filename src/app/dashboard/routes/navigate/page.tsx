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
  Route as MapIcon,
  Copy,
  Search,
  Flag,
  Filter,
} from "lucide-react";

interface House {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null; // เปลี่ยนจาก string เป็น string | null
  order_index: number;
  created_at: string;
  updated_at: string | null; // เพิ่ม | null ให้ด้วย (ดีกว่า)
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

function formatThaiShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear() + 543}`;
}

const extractHouseNumber = (address: string): string => {
  const m = address.match(
    /(?:บ้านเลขที่|เลขที่|ที่\s*)?\s*([\d\/\\-]+)\s*(?:\/\s*\d+)?/i,
  );
  return m ? m[1].trim() : "";
};

export default function NavigatePage() {
  // ──────────────────────── State ────────────────────────
  const [houses, setHouses] = useState<House[]>([]);
  const [pendingDates, setPendingDates] = useState<
    { original_date: string; count: number }[]
  >([]);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [useManualCurrent, setUseManualCurrent] = useState(false);
  const [startPosition, setStartPosition] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [sorting, setSorting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Manual coord inputs
  const [manualCoordInput, setManualCoordInput] = useState("");
  const [startCoordInput, setStartCoordInput] = useState("");
  const [startNameInput, setStartNameInput] = useState("");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);
  // Filters
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [showNoCoords, setShowNoCoords] = useState(false);
  const [showWithCoords, setShowWithCoords] = useState(false);
  const [groupByHouseNumber, setGroupByHouseNumber] = useState(false);
  const [groupNearbyHouses, setGroupNearbyHouses] = useState(false);
  // Refs
  const shouldResortRef = useRef(false);
  const isSortingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const houseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ──────────────────────── Computed ────────────────────────
  const totalPending = useMemo(
    () => pendingDates.reduce((s, i) => s + i.count, 0),
    [pendingDates],
  );

  const { filteredHouses, filteredCount, filterDescription } = useMemo(() => {
    let result = houses;
    if (houseNumberFilter.trim()) {
      result = result.filter((h) =>
        extractHouseNumber(h.address)
          .toLowerCase()
          .includes(houseNumberFilter.trim().toLowerCase()),
      );
    }
    if (showNoCoords && !showWithCoords)
      result = result.filter((h) => !h.lat || !h.lng);
    else if (showWithCoords && !showNoCoords)
      result = result.filter((h) => h.lat && h.lng);
    if (groupByHouseNumber) {
      result = [...result].sort((a, b) => {
        const ha = extractHouseNumber(a.address);
        const hb = extractHouseNumber(b.address);
        if (ha && hb)
          return ha === hb
            ? a.order_index - b.order_index
            : ha.localeCompare(hb, undefined, { numeric: true });
        return ha ? -1 : hb ? 1 : 0;
      });
    }
    const count = result.length;
    let desc = `ทั้งหมด ${count} บ้าน`;
    if (showNoCoords && !showWithCoords) desc = `ไม่มีพิกัด • ${count} บ้าน`;
    else if (showWithCoords && !showNoCoords) desc = `มีพิกัด • ${count} บ้าน`;
    else if (houseNumberFilter.trim())
      desc = `บ้านเลขที่ "${houseNumberFilter.trim()}" • ${count} บ้าน`;
    return {
      filteredHouses: result,
      filteredCount: count,
      filterDescription: desc,
    };
  }, [
    houses,
    houseNumberFilter,
    showNoCoords,
    showWithCoords,
    groupByHouseNumber,
  ]);

  const isUsingDefault =
    !currentPosition ||
    (Math.abs(currentPosition.lat - DEFAULT_POSITION.lat) < 0.001 &&
      Math.abs(currentPosition.lng - DEFAULT_POSITION.lng) < 0.001);

  // ──────────────────────── Toast ────────────────────────
  const addToast = (
    msg: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    el.className = `flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-in slide-in-from-top ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
          ? "bg-red-600"
          : "bg-blue-600"
    }`;
    el.innerHTML = `<span class="font-bold">${
      type === "success" ? "สำเร็จ" : type === "error" ? "ผิดพลาด" : "แจ้ง"
    }</span> ${msg}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  // ──────────────────────── Core Functions ────────────────────────
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์แล้ว", "success");
    } catch {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
  };

  const getCurrentPosition = () =>
    new Promise<{ lat: number; lng: number }>((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("ไม่รองรับ"));
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
        rej,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    });

  const detectLocation = async (forStart = false) => {
    try {
      const pos = await getCurrentPosition();
      if (forStart) {
        setDetectedStartLat(pos.lat);
        setDetectedStartLng(pos.lng);
        setStartCoordInput(`${pos.lat},${pos.lng}`);
      } else {
        setDetectedLat(pos.lat);
        setDetectedLng(pos.lng);
        setManualCoordInput(`${pos.lat},${pos.lng}`);
      }
      addToast("ตรวจจับตำแหน่งสำเร็จ", "success");
    } catch {
      addToast("หาตำแหน่งไม่เจอ", "error");
    }
  };

  const validateCoords = (lat: number, lng: number) =>
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const setManualPosition = () => {
    if (
      !detectedLat ||
      !detectedLng ||
      !validateCoords(detectedLat, detectedLng)
    )
      return addToast("พิกัดไม่ถูกต้อง", "error");
    setCurrentPosition({ lat: detectedLat, lng: detectedLng });
    setUseManualCurrent(true);
    setShowManualModal(false);
    addToast("ใช้พิกัด manual แล้ว", "success");
    shouldResortRef.current = true;
  };

  const handleSetStartPosition = async () => {
    if (
      !detectedStartLat ||
      !detectedStartLng ||
      !validateCoords(detectedStartLat, detectedStartLng)
    )
      return addToast("พิกัดไม่ถูกต้อง", "error");
    try {
      await supabase.rpc("save_start_position", {
        p_lat: detectedStartLat,
        p_lng: detectedStartLng,
        p_name: startNameInput || null,
      });
    } catch (e: any) {
      addToast(`บันทึกไม่สำเร็จ: ${e.message}`, "error");
      return;
    }
    const name = startNameInput || "จุดเริ่มต้น";
    setStartPosition({ lat: detectedStartLat, lng: detectedStartLng, name });
    localStorage.setItem(
      "startPosition",
      JSON.stringify({ lat: detectedStartLat, lng: detectedStartLng, name }),
    );
    setShowStartModal(false);
    setStartNameInput("");
    addToast(`ตั้งจุดเริ่มต้นแล้ว: ${name}`, "success");
    shouldResortRef.current = true;
  };

  const clearStartPosition = async () => {
    try {
      await supabase.rpc("clear_start_position");
    } catch {}
    localStorage.removeItem("startPosition");
    setStartPosition(null);
    addToast("ล้างจุดเริ่มต้นแล้ว", "success");
    shouldResortRef.current = true;
  };

  const loadStartPosition = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("get_start_position");
      let sp = data?.[0] || null;
      if (!sp) {
        const saved = localStorage.getItem("startPosition");
        if (saved) sp = JSON.parse(saved);
      }
      if (sp) {
        setStartPosition({
          lat: sp.lat,
          lng: sp.lng,
          name: sp.name || undefined,
        });
        shouldResortRef.current = true;
      }
    } catch {}
  }, []);

  const distanceCache = useMemo(() => new Map<string, number>(), []);

  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const key = `${lat1.toFixed(6)},${lng1.toFixed(6)},${lat2.toFixed(6)},${lng2.toFixed(6)}`;
      if (distanceCache.has(key)) return distanceCache.get(key)!;
      const d = vincentyDistance(lat1, lng1, lat2, lng2);
      distanceCache.set(key, d);
      return d;
    },
    [distanceCache],
  );

  const refreshData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { data } = await supabase.rpc("refresh_and_merge_today_houses");
      setHouses(
        (data || []).map((h: any) => ({
          id: h.id,
          user_id: h.user_id,
          full_name: h.full_name,
          phone: h.phone,
          address: h.address,
          lat: h.lat ? Number(h.lat) : null,
          lng: h.lng ? Number(h.lng) : null,
          note: h.note ?? null, // แก้ตรงนี้! ใช้ ?? null (เผื่อเป็น undefined)
          order_index: Number(h.order_index),
          created_at: h.created_at,
          updated_at: h.updated_at,
        })),
      );
    } catch {}
    try {
      const { data: pending } = await supabase
        .from("pending_houses")
        .select("original_date")
        .eq("user_id", user.id);
      const map = new Map<string, number>();
      pending?.forEach((r: any) =>
        map.set(r.original_date, (map.get(r.original_date) || 0) + 1),
      );
      setPendingDates(
        Array.from(map.entries())
          .map(([d, c]) => ({ original_date: d, count: c }))
          .sort(
            (a, b) =>
              new Date(a.original_date).getTime() -
              new Date(b.original_date).getTime(),
          ),
      );
    } catch {}
    shouldResortRef.current = true;
  }, []);

  const reSortHouses = useCallback(async () => {
    if (
      (!startPosition && !currentPosition) ||
      houses.length === 0 ||
      isSortingRef.current
    )
      return;
    setSorting(true);
    isSortingRef.current = true;
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const withCoords = houses.filter((h) => h.lat && h.lng);
    const without = houses.filter((h) => !h.lat || !h.lng);
    let sorted = withCoords
      .map((h) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat!, h.lng!),
      }))
      .sort((a, b) => a.dist - b.dist);
    if (groupNearbyHouses && sorted.length > 1) {
      const clusters: (typeof sorted)[] = [];
      const used = new Set<number>();
      const threshold = 0.5;
      for (let i = 0; i < sorted.length; i++) {
        if (used.has(i)) continue;
        const cluster = [sorted[i]];
        used.add(i);
        for (let j = i + 1; j < sorted.length; j++) {
          if (used.has(j)) continue;
          const d = calculateDistance(
            sorted[i].lat!,
            sorted[i].lng!,
            sorted[j].lat!,
            sorted[j].lng!,
          );
          if (d <= threshold) {
            cluster.push(sorted[j]);
            used.add(j);
          }
        }
        clusters.push(cluster);
      }
      clusters.sort((a, b) => a[0].dist - b[0].dist);
      sorted = clusters.flat();
    }
    const final = [
      ...sorted.map((h, i) => ({ ...h, order_index: i + 1 })),
      ...without
        .sort((a, b) => a.order_index - b.order_index)
        .map((h, i) => ({ ...h, order_index: sorted.length + i + 1 })),
    ];
    try {
      await Promise.all(
        final.map((h) =>
          supabase
            .from("today_houses")
            .update({ order_index: h.order_index })
            .eq("id", h.id),
        ),
      );
      setHouses(final);
    } catch {
      addToast("เรียงลำดับไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
      isSortingRef.current = false;
    }
  }, [
    startPosition,
    currentPosition,
    houses,
    calculateDistance,
    groupNearbyHouses,
  ]);

  const openFullRouteOnMaps = useCallback(() => {
    if (!startPosition && !currentPosition)
      return addToast("ไม่มีจุดเริ่มต้น", "error");
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const valid = houses.filter((h) => h.lat && h.lng);
    if (valid.length === 0) return addToast("ไม่มีบ้านที่มีพิกัด", "error");
    const sorted = valid
      .map((h) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat!, h.lng!),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20);
    const points = [
      origin,
      ...sorted.map((h) => ({ lat: h.lat!, lng: h.lng! })),
    ];
    const url = `https://www.google.com/maps/dir/${points.map((p) => `${p.lat},${p.lng}`).join("/")}`;
    window.open(url, "_blank");
    addToast(`เปิดเส้นทาง ${sorted.length} จุด`, "success");
  }, [startPosition, currentPosition, houses, calculateDistance]);

  const markDelivered = async (id: string) => {
    if (!confirm("ยืนยันส่งแล้ว?")) return;
    try {
      await supabase.from("today_houses").delete().eq("id", id);
      setHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("บันทึกส่งแล้ว", "success");
      shouldResortRef.current = true;
    } catch {
      addToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const deleteHouse = async (id: string) => {
    if (!confirm("ลบรายการนี้?")) return;
    try {
      await supabase.from("today_houses").delete().eq("id", id);
      setHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("ลบแล้ว", "success");
      shouldResortRef.current = true;
    } catch {
      addToast("ลบไม่สำเร็จ", "error");
    }
  };

  const openMaps = (lat: number, lng: number) => {
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };

  const forceRefreshLocationAndSort = async () => {
    setSorting(true);
    try {
      const pos = await getCurrentPosition();
      setCurrentPosition(pos);
      setUseManualCurrent(false);
      addToast("รีเฟรช GPS สำเร็จ", "success");
      shouldResortRef.current = true;
    } catch {
      addToast("รีเฟรชไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
    }
  };

  // ──────────────────────── Effects ────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await refreshData();
      await loadStartPosition();
      try {
        const pos = await getCurrentPosition();
        if (mounted) setCurrentPosition(pos);
      } catch {
        if (mounted) setCurrentPosition(DEFAULT_POSITION);
      }
      if (mounted) setLoading(false);
      shouldResortRef.current = true;
    };
    init();
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!useManualCurrent) {
            setCurrentPosition({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            shouldResortRef.current = true;
          }
        },
        () => {},
        { enableHighAccuracy: true },
      );
    }
    return () => {
      mounted = false;
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      shouldResortRef.current &&
      (startPosition || currentPosition) &&
      houses.length > 0 &&
      !sorting
    ) {
      shouldResortRef.current = false;
      const t = setTimeout(reSortHouses, 600);
      return () => clearTimeout(t);
    }
  }, [startPosition, currentPosition, houses.length, sorting, reSortHouses]);

  // ──────────────────────── Render ────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const displayedHouses = filteredHouses.filter((h) =>
    searchQuery
      ? h.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.phone.includes(searchQuery) ||
        h.address.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 text-gray-800">
        {/* ==================== Header ==================== */}
        <div className="sticky top-0 bg-white border-b z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold">นำทางวันนี้</h1>
                <p className="text-lg font-semibold text-indigo-600 mt-1">
                  {filterDescription}
                </p>
                {totalPending > 0 && (
                  <button
                    onClick={() => setShowPendingModal(true)}
                    className="text-sm text-blue-600 underline"
                  >
                    ดึงงานค้าง {totalPending} รายการ
                  </button>
                )}
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <button
                  onClick={() => setShowStartModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  <Flag className="w-5 h-5" />{" "}
                  {startPosition ? "แก้จุดเริ่ม" : "จุดเริ่ม"}
                </button>
                <button
                  onClick={forceRefreshLocationAndSort}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${sorting ? "animate-spin" : ""}`}
                  />{" "}
                  รีเฟรช
                </button>
                <button
                  onClick={openFullRouteOnMaps}
                  className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-orange-600 to-red-600 text-white font-bold rounded-lg"
                >
                  <MapIcon className="w-5 h-5" /> เส้นทางทั้งหมด
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 text-gray-800">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, เบอร์, ที่อยู่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                onClick={() => setShowFilterModal(true)}
                className="px-5 py-3 bg-purple-600 text-white rounded-xl"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Warning GPS */}
        {isUsingDefault && !startPosition && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex justify-between items-center">
              <span>กำลังรอ GPS...</span>
              <button
                onClick={() => setShowManualModal(true)}
                className="underline font-medium"
              >
                ตั้งตำแหน่งเอง
              </button>
            </div>
          </div>
        )}

        {/* ==================== House Cards ==================== */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {displayedHouses.map((house, idx) => {
            const origin = startPosition || currentPosition || DEFAULT_POSITION;
            const distance =
              house.lat && house.lng
                ? calculateDistance(
                    origin.lat,
                    origin.lng,
                    house.lat,
                    house.lng,
                  )
                : null;

            return (
              <div
                key={house.id}
                ref={(el) => {
                  houseRefs.current[idx] = el;
                  return undefined; // ถ้าจะกันผิดแบบโหดๆ 555
                }}
                // เพิ่ม 2 event นี้
                onTouchStart={(e) =>
                  e.currentTarget.classList.add("touch-active")
                }
                onTouchEnd={(e) =>
                  e.currentTarget.classList.remove("touch-active")
                }
                onMouseEnter={(e) =>
                  e.currentTarget.classList.add("touch-active")
                }
                onMouseLeave={(e) =>
                  e.currentTarget.classList.remove("touch-active")
                }
                className="group relative bg-white rounded-2xl shadow hover:shadow-xl border overflow-hidden transition-all duration-300"
              >
                {/* ปุ่มถังขยะ – โชว์ทั้ง hover และแตะมือถือ */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHouse(house.id);
                  }}
                  className="absolute top-3 right-3 z-20
                             opacity-0 translate-y-2
                             group-hover:opacity-100 group-hover:translate-y-0
                             group-[.touch-active]:opacity-100 group-[.touch-active]:translate-y-0
                             transition-all duration-300
                             bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                {/* ส่วนที่เหลือเหมือนเดิมทุกอย่าง */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl font-bold text-indigo-600">
                      #{house.order_index}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{house.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">{house.phone}</span>
                    <button onClick={() => copyPhone(house.phone)}>
                      <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {house.address}
                  </p>
                  {/* เพิ่มหมายเหตุตรงนี้ */}
                  {house.note?.trim() && (
                    <p className="text-xs text-amber-700 mt-1 italic">
                      หมายเหตุ : {house.note.trim()}
                    </p>
                  )}

                  {distance !== null && (
                    <p className="text-xs text-gray-500 mt-2">
                      ~ ระยะทางโดยประมาณ{" "}
                      <span className="text-blue-500 font-semibold">
                        {distance.toFixed(1)}
                      </span>{" "}
                      กม.
                    </p>
                  )}
                </div>
                <div className="px-5 pb-5 flex gap-3">
                  {house.lat && house.lng ? (
                    <button
                      onClick={() => openMaps(house.lat!, house.lng!)}
                      className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-green-700 transition"
                    >
                      <Navigation className="w-5 h-5" /> นำทาง
                    </button>
                  ) : (
                    <div className="flex-1 py-3 text-center bg-gray-100 rounded-xl text-sm text-gray-500">
                      ไม่มีพิกัด
                    </div>
                  )}
                  <button
                    onClick={() => markDelivered(house.id)}
                    className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:from-blue-700 hover:to-indigo-700 transition"
                  >
                    ส่งแล้ว
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden z-50">
          <div className="flex justify-around py-3">
            <button
              onClick={() => setShowStartModal(true)}
              className="flex flex-col items-center gap-1"
            >
              <Flag
                className={`w-7 h-7 ${startPosition ? "text-green-600" : "text-gray-600"}`}
              />
              <span className="text-xs">
                {startPosition ? "แก้จุดเริ่ม" : "จุดเริ่ม"}
              </span>
            </button>
            <button
              onClick={forceRefreshLocationAndSort}
              className="flex flex-col items-center gap-1"
            >
              <RefreshCw
                className={`w-8 h-8 text-yellow-600 ${sorting ? "animate-spin" : ""}`}
              />
              <span className="text-xs">รีเฟรช</span>
            </button>
            <button
              onClick={openFullRouteOnMaps}
              className="flex flex-col items-center gap-1"
            >
              <MapIcon className="w-8 h-8 text-red-600" />
              <span className="text-xs">เส้นทางทั้งหมด</span>
            </button>
          </div>
        </div>

        <div
          id="toast-container"
          className="fixed top-16 left-4 right-4 z-50 space-y-2"
        />

        {/* ==================== Modals ==================== */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตั้งตำแหน่งปัจจุบัน</h2>
                <button onClick={() => setShowManualModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={() => detectLocation(false)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl mb-4"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับ GPS
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
                className="w-full px-4 py-3 border rounded-xl text-center font-mono"
              />
              <button
                onClick={setManualPosition}
                disabled={!detectedLat || !detectedLng}
                className="w-full mt-5 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                บันทึกและเรียงใหม่
              </button>
            </div>
          </div>
        )}

        {showStartModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตั้งจุดเริ่มต้น</h2>
                <button onClick={() => setShowStartModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={() => detectLocation(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl mb-4"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับ GPS
              </button>
              <input
                type="text"
                placeholder="16.8833,99.125"
                value={startCoordInput}
                onChange={(e) => {
                  setStartCoordInput(e.target.value);
                  const [lat, lng] = e.target.value.split(",").map(parseFloat);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setDetectedStartLat(lat);
                    setDetectedStartLng(lng);
                  }
                }}
                className="w-full px-4 py-3 border rounded-xl text-center font-mono mb-3"
              />
              <input
                type="text"
                placeholder="ชื่อจุด (ไม่บังคับ)"
                value={startNameInput}
                onChange={(e) => setStartNameInput(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSetStartPosition}
                  disabled={!detectedStartLat}
                  className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  บันทึก
                </button>
                <button
                  onClick={clearStartPosition}
                  className="flex-1 py-3 bg-gray-500 text-white rounded-xl"
                >
                  ล้าง
                </button>
              </div>
            </div>
          </div>
        )}

        {showFilterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full text-gray-800">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตัวกรอง</h2>
                <button onClick={() => setShowFilterModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <input
                type="text"
                placeholder="บ้านเลขที่..."
                value={houseNumberFilter}
                onChange={(e) => setHouseNumberFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl mb-4"
              />
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showNoCoords}
                    onChange={(e) => {
                      setShowNoCoords(e.target.checked);
                      setShowWithCoords(false);
                    }}
                    className="w-5 h-5"
                  />
                  <span>ไม่มีพิกัด</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showWithCoords}
                    onChange={(e) => {
                      setShowWithCoords(e.target.checked);
                      setShowNoCoords(false);
                    }}
                    className="w-5 h-5"
                  />
                  <span>มีพิกัดแล้ว</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={groupByHouseNumber}
                    onChange={(e) => setGroupByHouseNumber(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span>จัดกลุ่มตามบ้านเลขที่</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={groupNearbyHouses}
                    onChange={(e) => {
                      setGroupNearbyHouses(e.target.checked);
                      shouldResortRef.current = true;
                    }}
                    className="w-5 h-5"
                  />
                  <span>จัดกลุ่มบ้านใกล้กัน (500ม.)</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setHouseNumberFilter("");
                    setShowNoCoords(false);
                    setShowWithCoords(false);
                    setGroupByHouseNumber(false);
                    setShowFilterModal(false);
                  }}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ล้าง
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  ใช้ตัวกรอง
                </button>
              </div>
            </div>
          </div>
        )}

        {showPendingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
                <h2 className="text-xl font-bold">งานค้าง</h2>
                <button onClick={() => setShowPendingModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              {pendingDates.length === 0 ? (
                <p className="text-center py-8 text-gray-500">ไม่มีงานค้าง</p>
              ) : (
                pendingDates.map((pd) => (
                  <div
                    key={pd.original_date}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-xl mb-3"
                  >
                    <div>
                      <p className="font-bold">
                        {formatThaiShortDate(pd.original_date)}
                      </p>
                      <p className="text-sm text-gray-600">{pd.count} รายการ</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          supabase
                            .from("pending_houses")
                            .delete()
                            .eq("original_date", pd.original_date)
                        }
                        className="text-red-600 underline"
                      >
                        ล้าง
                      </button>
                      <button
                        onClick={() =>
                          supabase
                            .rpc("load_pending_to_today", {
                              p_original_date: pd.original_date,
                            })
                            .then(() => {
                              refreshData();
                              setShowPendingModal(false);
                            })
                        }
                        className="text-blue-600 underline font-medium"
                      >
                        ดึงมา
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
