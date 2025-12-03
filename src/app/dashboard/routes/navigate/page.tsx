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
  Copy, // สำหรับคัดลอก
  Search, // สำหรับไอคอนค้นหา
  Flag, // สำหรับไอคอนจุดเริ่มต้น
  ExternalLink, // สำหรับไอคอนตรวจสอบแผนที่
} from "lucide-react";
interface House {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
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
function formatThaiShortDate(original_date: string): string {
  const date = new Date(original_date);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = (date.getFullYear() + 543).toString();
  return `${day}/${month}/${year}`;
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
  const [useManualCurrent, setUseManualCurrent] = useState(false); // Flag เพื่อ persist manual current จนกว่าจะรีเฟรช
  const [startPosition, setStartPosition] = useState<{
    // จุดเริ่มต้นสำหรับนำทาง
    lat: number;
    lng: number;
    name?: string; // เพิ่มชื่อ optional จาก SQL
  } | null>(null);
  const [sorting, setSorting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // สำหรับค้นหา
  const [showManualModal, setShowManualModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false); // Modal สำหรับจุดเริ่มต้น
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [manualCoordInput, setManualCoordInput] = useState("");
  const [startCoordInput, setStartCoordInput] = useState(""); // Input สำหรับจุดเริ่มต้น
  const [startNameInput, setStartNameInput] = useState(""); // ชื่อจุดเริ่มต้น (optional)
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);
  const shouldResortRef = useRef(false);
  const isSortingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const houseRefs = useRef<(HTMLDivElement | null)[]>([]); // Refs สำหรับ scroll to house
  // ย้าย sortedHouses และ totalHouses ขึ้นมาที่นี่ เพื่อให้ access ได้ก่อน useCallback
  const sortedHouses = useMemo(
    () => houses.sort((a, b) => a.order_index - b.order_index),
    [houses],
  );
  const totalHouses = useMemo(() => sortedHouses.length, [sortedHouses]);
  const totalPending = useMemo(
    () => pendingDates.reduce((sum, item) => sum + item.count, 0),
    [pendingDates],
  );
  const isUsingDefault =
    !currentPosition ||
    (Math.abs(currentPosition.lat - DEFAULT_POSITION.lat) < 0.001 &&
      Math.abs(currentPosition.lng - DEFAULT_POSITION.lng) < 0.001);
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
  // คัดลอกเบอร์โทร
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์โทรแล้ว", "success");
    } catch (err) {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
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
  const detectLocation = async (isForStart = false) => {
    // รองรับ both manual และ start
    try {
      const pos = await getCurrentPosition();
      if (isForStart) {
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
      addToast("ไม่สามารถหาตำแหน่งได้", "error");
    }
  };
  // Validate พิกัด (lat: -90 to 90, lng: -180 to 180)
  const validateCoords = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };
  const setManualPosition = () => {
    if (
      !detectedLat ||
      !detectedLng ||
      !validateCoords(detectedLat, detectedLng)
    )
      return addToast("พิกัดไม่ถูกต้อง (เช็ค lat/lng)", "error");
    setCurrentPosition({ lat: detectedLat, lng: detectedLng });
    setUseManualCurrent(true); // Persist manual จนกว่าจะรีเฟรช
    setShowManualModal(false);
    addToast(
      "ตั้งค่าตำแหน่ง manual แล้ว → กำลังเรียงใหม่... (กดรีเฟรชเพื่อกลับไป GPS)",
      "success",
    );
    shouldResortRef.current = true;
  };
  // ตั้งจุดเริ่มต้น (แก้ชื่อฟังก์ชันเพื่อหลีกเลี่ยง conflict)
  const handleSetStartPosition = async () => {
    if (
      !detectedStartLat ||
      !detectedStartLng ||
      !validateCoords(detectedStartLat, detectedStartLng)
    )
      return addToast("พิกัดไม่ถูกต้อง (เช็ค lat/lng)", "error");
    // Sync กับฐานข้อมูล (ใช้ RPC จาก SQL) - persist จนกว่าจะล้างเอง
    try {
      const { error } = await supabase.rpc("save_start_position", {
        p_lat: detectedStartLat,
        p_lng: detectedStartLng,
        p_name: startNameInput || null,
      });
      if (error) throw error;
    } catch (err: any) {
      addToast(`บันทึกจุดเริ่มต้นไม่สำเร็จ: ${err.message}`, "error");
      return;
    }
    const name = startNameInput || "ไม่ระบุ";
    setStartPosition({
      lat: detectedStartLat,
      lng: detectedStartLng,
      name: startNameInput || undefined,
    });
    // Backup to localStorage เพื่อ persist เพิ่มเติม
    localStorage.setItem(
      "startPosition",
      JSON.stringify({
        lat: detectedStartLat,
        lng: detectedStartLng,
        name: startNameInput || null,
      }),
    );
    setShowStartModal(false);
    setStartNameInput(""); // Reset input หลัง toast
    addToast(
      `ตั้งจุดเริ่มต้นแล้ว (ชื่อ: ${name}) - persist จนกว่าจะล้าง`,
      "success",
    );
    shouldResortRef.current = true; // Trigger เรียงใหม่ทันทีโดยใช้ startPosition
  };
  // โหลด start position จากฐานข้อมูลตอน init (เพิ่ม fallback localStorage)
  const loadStartPosition = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_start_position");
      if (error) throw error;
      let sp = null;
      if (data && data.length > 0) {
        sp = data[0];
        console.log("Loaded start position from DB:", sp);
      } else {
        // Fallback to localStorage ถ้า DB ไม่มี
        const saved = localStorage.getItem("startPosition");
        if (saved) {
          sp = JSON.parse(saved);
          console.log("Loaded start position from localStorage:", sp);
        }
      }
      if (sp) {
        setStartPosition({
          lat: sp.lat,
          lng: sp.lng,
          name: sp.name || undefined,
        });
        shouldResortRef.current = true; // Trigger เรียงใหม่ถ้ามี startPosition
      } else {
        console.log("No start position found (DB or localStorage)");
      }
    } catch (err: any) {
      console.log("Load start position error (DB):", err);
      // Fallback to localStorage on error
      const saved = localStorage.getItem("startPosition");
      if (saved) {
        const sp = JSON.parse(saved);
        setStartPosition({
          lat: sp.lat,
          lng: sp.lng,
          name: sp.name || undefined,
        });
        shouldResortRef.current = true;
        console.log("Fallback loaded start position from localStorage:", sp);
      }
    }
  }, []);
  // ล้างจุดเริ่มต้น
  const clearStartPosition = async () => {
    // Sync กับฐานข้อมูล - ล้าง persist
    try {
      const { error } = await supabase.rpc("clear_start_position");
      if (error) throw error;
    } catch (err: any) {
      addToast(`ล้างจุดเริ่มต้นไม่สำเร็จ: ${err.message}`, "error");
      return;
    }
    // ล้าง localStorage ด้วย
    localStorage.removeItem("startPosition");
    setStartPosition(null);
    setDetectedStartLat(null);
    setDetectedStartLng(null);
    setStartCoordInput("");
    setStartNameInput("");
    addToast("ล้างจุดเริ่มต้นแล้ว - กลับไปใช้ currentPosition ปกติ", "success");
    shouldResortRef.current = true; // Trigger เรียงใหม่โดย fallback ไป currentPosition
  };
  // ตรวจสอบพิกัดบน Google Maps (คล้าย HousesPage)
  const verifyOnMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank",
    );
  };
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
  const clearPendingForDate = async (original_date: string) => {
    if (
      !confirm(
        `ล้างงานค้างของวันที่ ${formatThaiShortDate(original_date)} จริงหรือ? (ไม่สามารถกู้คืนได้)`,
      )
    )
      return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return addToast("กรุณาเข้าสู่ระบบก่อน", "error");
    try {
      const { error } = await supabase
        .from("pending_houses")
        .delete()
        .eq("user_id", user.id)
        .eq("original_date", original_date);
      if (error) throw error;
      await refreshData();
      addToast(
        `ล้างงานค้างของวันที่ ${formatThaiShortDate(original_date)} เรียบร้อย!`,
        "success",
      );
    } catch (err: any) {
      addToast(`ล้างไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
    }
  };
  // ล้างงานวันนี้ทั้งหมด
  const clearAllToday = async () => {
    if (!confirm("ล้างงานวันนี้ทั้งหมดจริงหรือ? (ไม่สามารถกู้คืนได้)")) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return addToast("กรุณาเข้าสู่ระบบก่อน", "error");
    try {
      const { error } = await supabase
        .from("today_houses")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setHouses([]);
      addToast("ล้างงานวันนี้ทั้งหมดเรียบร้อย!", "success");
    } catch (err: any) {
      addToast(`ล้างไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
    }
  };
  const refreshData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc(
        "refresh_and_merge_today_houses",
      );
      if (error) throw error;
      setHouses(
        (data || []).map((h: any) => ({
          id: h.id,
          user_id: h.user_id,
          full_name: h.full_name,
          phone: h.phone,
          address: h.address,
          lat: h.lat ? Number(h.lat) : null,
          lng: h.lng ? Number(h.lng) : null,
          order_index: Number(h.order_index),
          created_at: h.created_at,
          updated_at: h.updated_at,
        })),
      );
      if ((data || []).length > 0)
        addToast("อัพเดทข้อมูลล่าสุดเรียบร้อย!", "success");
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
              id: t.id,
              user_id: t.user_id,
              full_name: t.full_name,
              phone: t.phone,
              address: t.address,
              lat: t.lat ? Number(t.lat) : p?.lat ? Number(p.lat) : null,
              lng: t.lng ? Number(t.lng) : p?.lng ? Number(p.lng) : null,
              order_index: Number(t.order_index),
              created_at: t.created_at,
              updated_at: t.updated_at,
            };
          })
          .sort((a: any, b: any) => a.order_index - b.order_index);
        setHouses(fallbackMerged);
      } catch {}
    }
    // Load pending + count รายการ per date
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
            new Date(a.original_date).getTime() -
            new Date(b.original_date).getTime(),
        );
      setPendingDates(pendingList);
    } catch {}
    shouldResortRef.current = true;
  }, []);
  const reSortHouses = useCallback(async () => {
    if (
      (!startPosition && !currentPosition) ||
      houses.length === 0 ||
      isSortingRef.current
    )
      return; // Skip ถ้าไม่มี origin
    setSorting(true);
    isSortingRef.current = true;
    // ใช้ startPosition เป็นหลัก ถ้ามี มิเช่นนั้น currentPosition
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const withCoords = houses.filter((h) => h.lat && h.lng);
    const withoutCoords = houses.filter((h) => !h.lat || !h.lng);
    const sortedWith = withCoords
      .map((h) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat!, h.lng!),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map((h, i) => ({ ...h, order_index: i + 1 }));
    const sortedWithout = withoutCoords
      .sort((a, b) => a.order_index - b.order_index)
      .map((h, i) => ({ ...h, order_index: sortedWith.length + i + 1 }));
    const sortedHousesLocal = [...sortedWith, ...sortedWithout];
    try {
      await Promise.all(
        sortedHousesLocal.map((h) =>
          supabase
            .from("today_houses")
            .update({ order_index: h.order_index })
            .eq("id", h.id),
        ),
      );
      setHouses(sortedHousesLocal);
    } catch (err: any) {
      addToast(`เรียงลำดับไม่สำเร็จ: ${err.message || "Unknown"}`, "error");
    } finally {
      setSorting(false);
      isSortingRef.current = false;
    }
  }, [startPosition, currentPosition, houses, calculateDistance]);
  // Handle search และ scroll (ตอนนี้ sortedHouses มี define แล้ว)
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        const matchedHouse = sortedHouses.find(
          (h) =>
            h.full_name.toLowerCase().includes(lowerQuery) ||
            h.phone.includes(query) ||
            h.address.toLowerCase().includes(lowerQuery),
        );
        if (matchedHouse) {
          const index = sortedHouses.findIndex((h) => h.id === matchedHouse.id);
          if (index !== -1 && houseRefs.current[index]) {
            houseRefs.current[index]?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        } else {
          addToast("ไม่พบรายการที่ค้นหา", "info");
          setSearchQuery(""); // Clear ถ้าไม่พบ
        }
      }
    },
    [sortedHouses],
  );
  const openFullRouteOnMaps = useCallback(async () => {
    if (!startPosition && !currentPosition) {
      return addToast("ยังไม่มีตำแหน่งเริ่มต้น", "error");
    }

    await refreshData(); // รีเฟรชข้อมูลล่าสุดก่อน

    const origin = startPosition || currentPosition || DEFAULT_POSITION;

    // ดึงเฉพาะบ้านที่มีพิกัด
    const validHouses = houses
      .filter((h) => h.lat && h.lng)
      .map((h) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat!, h.lng!),
      }));

    if (validHouses.length === 0) {
      return addToast("ไม่มีจุดหมายที่มีพิกัด", "error");
    }

    // เรียงตามระยะทางใกล้ที่สุด
    const sortedByDistance = [...validHouses].sort((a, b) => a.dist - b.dist);

    // อัพเดท order_index ในฐานข้อมูล (ใช้ลำดับตามระยะทางจริง)
    const updatedHouses = sortedByDistance.map((h, i) => ({
      ...h,
      order_index: i + 1,
    }));

    try {
      await Promise.all(
        updatedHouses.map((h) =>
          supabase
            .from("today_houses")
            .update({ order_index: h.order_index })
            .eq("id", h.id),
        ),
      );

      // อัพเดท state ให้แสดงลำดับใหม่ทันที
      setHouses((prev) =>
        prev.map((house) => {
          const updated = updatedHouses.find((u) => u.id === house.id);
          return updated
            ? { ...house, order_index: updated.order_index }
            : house;
        }),
      );
    } catch (err) {
      console.error("อัพเดท order_index ไม่สำเร็จ:", err);
      // ไม่แจ้ง error เพราะไม่ใช่จุดหลักของฟีเจอร์นี้
    }

    // จำกัดแค่ 20 บ้านแรกสำหรับเปิดใน Google Maps
    const housesForMap = sortedByDistance.slice(0, 20);

    const points = [
      `${origin.lat},${origin.lng}`, // จุดเริ่มต้น
      ...housesForMap.map((h) => `${h.lat},${h.lng}`),
    ];

    const url = `https://www.google.com/maps/dir/${points
      .map(encodeURIComponent)
      .join("/")}`;

    const totalValid = validHouses.length;
    const usedCount = housesForMap.length;

    const message =
      totalValid > 20
        ? `เปิดเส้นทาง 20 บ้านแรก (จากทั้งหมด ${totalValid} บ้านที่มีพิกัด)`
        : `เปิดเส้นทางทั้งหมด ${usedCount} บ้าน`;

    addToast(message, "success");
    window.open(url, "_blank");
  }, [startPosition, currentPosition, houses, calculateDistance, refreshData]);
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
  // Mark delivered = DELETE
  const markDelivered = async (id: string) => {
    if (!confirm("ยืนยันส่งแล้ว? (จะลบออกจากรายการ)")) return;
    try {
      const { error } = await supabase
        .from("today_houses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("บันทึกส่งแล้วเรียบร้อย!", "success");
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
      const origin = startPosition || currentPosition || DEFAULT_POSITION; // ใช้ start ถ้ามี
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`,
        "_blank",
      );
    },
    [startPosition, currentPosition],
  );
  const forceRefreshLocationAndSort = async () => {
    setSorting(true);
    try {
      const pos = await getCurrentPosition();
      setCurrentPosition(pos);
      setUseManualCurrent(false); // Reset manual mode กลับไป GPS ปกติ
      shouldResortRef.current = true;
      addToast("รีเฟรชตำแหน่ง GPS + เรียงใหม่แล้ว! (manual reset)", "success");
    } catch {
      addToast("รีเฟรชตำแหน่งไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
    }
  };
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      setUseManualCurrent(false); // เริ่มต้นใช้ GPS ปกติ
      await refreshData();
      // โหลด start position ก่อน เพื่อให้ persist ทันที
      await loadStartPosition();
      // แล้วค่อย set currentPosition จาก GPS (ถ้าไม่มี start จะ fallback ไป current)
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
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          if (!useManualCurrent) {
            // Skip ถ้า manual mode
            setCurrentPosition(newPos);
            shouldResortRef.current = true;
          }
        },
        (err) => console.log("watchPosition error:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    }
    const interval = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        if (!useManualCurrent) {
          // Skip ถ้า manual mode
          setCurrentPosition(pos);
          shouldResortRef.current = true;
        }
      } catch {}
    }, 30000);
    return () => {
      isMounted = false;
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      clearInterval(interval);
    };
  }, [refreshData, loadStartPosition, useManualCurrent]);
  useEffect(() => {
    if (
      shouldResortRef.current &&
      (startPosition || currentPosition) &&
      houses.length > 0 &&
      !loading &&
      !sorting
    ) {
      shouldResortRef.current = false;
      const timer = setTimeout(reSortHouses, 500);
      return () => clearTimeout(timer);
    }
  }, [
    startPosition,
    currentPosition,
    houses.length,
    loading,
    sorting,
    reSortHouses,
  ]);
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
        <div className="sticky top-0 bg-white border-b z-40">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  นำทางวันนี้
                </h1>
                <p className="text-sm text-gray-600">มี {totalHouses} บ้าน</p>
                {totalPending > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button
                      onClick={() => setShowPendingModal(true)}
                      className="text-blue-600 underline font-medium hover:text-blue-800"
                    >
                      ดึงงานค้างอีก {totalPending} รายการ
                    </button>
                  </div>
                )}
                {startPosition && (
                  <p className="text-sm text-green-600 mt-1">
                    เริ่มต้นจาก: จุดที่ตั้งเองแล้ว
                  </p>
                )}
                {useManualCurrent && !startPosition && (
                  <p className="text-sm text-blue-600 mt-1">
                    ใช้พิกัด manual (กดรีเฟรชเพื่อกลับ GPS)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* ปุ่มตั้งจุดเริ่มต้น */}
                <button
                  onClick={() => setShowStartModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium"
                  title="ตั้งจุดเริ่มต้นนำทาง"
                >
                  <Flag className="w-4 h-4" />
                  {startPosition ? "แก้" : "เพิ่ม"}จุดเริ่ม
                </button>
                <button
                  onClick={forceRefreshLocationAndSort}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${sorting ? "animate-spin" : ""}`}
                  />
                  รีเฟรช
                </button>
              </div>
            </div>
            {/* ช่องค้นหา */}
            <div className="relative mb-4 text-gray-800">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เบอร์, ที่อยู่... (เลื่อนไปหาอัตโนมัติ)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
              {/* เส้นทางทั้งหมด เหมือนเดิม */}
              <button
                onClick={openFullRouteOnMaps}
                className="flex items-center gap-2 px-5 py-3 bg-linear-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl shadow-md"
              >
                <MapIcon className="w-5 h-5" /> เส้นทางทั้งหมด
              </button>

              {/* ไอคอนล้างทั้งหมด อยู่ขวาสุด ไม่มีพื้นหลัง */}
              <button onClick={clearAllToday} className="p-2">
                <Trash2 className="w-6 h-6 text-black" />
              </button>
            </div>
          </div>
        </div>
        {isUsingDefault && !startPosition && (
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
        <div className="max-w-7xl mx-auto px-4 py-6 text-gray-800">
          {sortedHouses.length === 0 ? (
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
              {sortedHouses.map((house, index) => {
                // ใช้ origin สำหรับแสดงระยะทาง (startPosition ถ้ามี)
                const origin =
                  startPosition || currentPosition || DEFAULT_POSITION;
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
                      houseRefs.current[index] = el;
                    }} // แก้ไขตรงนี้: ใช้ block statement ไม่ return el
                    className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 transition-all overflow-hidden"
                  >
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={() => deleteHouse(house.id)}
                        className="text-gray-900 rounded-full shadow-lg hover:bg-red-600 active:scale-95 transition-all opacity-90 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl font-bold text-indigo-600">
                          #{house.order_index}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {house.full_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600">{house.phone}</p>
                        <button
                          onClick={() => copyPhone(house.phone)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="คัดลอกเบอร์โทร"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {house.address}
                      </p>
                      <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                        {distance !== null && (
                          <span>~ {distance.toFixed(1)} กม.</span>
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
                      <button
                        onClick={() => markDelivered(house.id)}
                        className="w-full mt-3 py-3 text-sm font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl"
                      >
                        ส่งแล้ว
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div
          id="toast-container"
          className="fixed top-16 right-4 z-50 space-y-3"
        />
        {/* Modal ตั้งค่าตำแหน่งปัจจุบัน (เดิม + ใหม่: ปุ่มตรวจสอบแผนที่) */}
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
                onClick={() => detectLocation(false)}
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
                    if (
                      !isNaN(lat) &&
                      !isNaN(lng) &&
                      validateCoords(lat, lng)
                    ) {
                      setDetectedLat(lat);
                      setDetectedLng(lng);
                    } else {
                      setDetectedLat(null);
                      setDetectedLng(null);
                    }
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              {/* ปุ่มตรวจสอบพิกัดบน Google Maps */}
              {detectedLat && detectedLng && (
                <div className="text-center mt-2 mb-4">
                  <button
                    onClick={() => verifyOnMaps(detectedLat, detectedLng)}
                    className="text-blue-600 text-sm underline flex items-center gap-1 mx-auto hover:text-blue-800 transition"
                  >
                    <ExternalLink className="w-4 h-4" /> ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}
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
        {/* Modal ตั้งจุดเริ่มต้น (ปรับ: เพิ่ม input ชื่อ + RPC sync) */}
        {showStartModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-gray-800">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตั้งจุดเริ่มต้นนำทาง</h2>
                <button
                  onClick={() => setShowStartModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={() => detectLocation(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 mb-4 transition"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับ GPS อัตโนมัติ
              </button>
              <input
                type="text"
                placeholder="16.8833,99.125"
                value={startCoordInput}
                onChange={(e) => {
                  setStartCoordInput(e.target.value);
                  const parts = e.target.value.split(",");
                  if (parts.length === 2) {
                    const lat = parseFloat(parts[0].trim());
                    const lng = parseFloat(parts[1].trim());
                    if (
                      !isNaN(lat) &&
                      !isNaN(lng) &&
                      validateCoords(lat, lng)
                    ) {
                      setDetectedStartLat(lat);
                      setDetectedStartLng(lng);
                    } else {
                      setDetectedStartLat(null);
                      setDetectedStartLng(null);
                    }
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-200 mb-2"
              />
              {/* ปุ่มตรวจสอบพิกัดบน Google Maps */}
              {detectedStartLat && detectedStartLng && (
                <div className="text-center mt-2 mb-4">
                  <button
                    onClick={() =>
                      verifyOnMaps(detectedStartLat, detectedStartLng)
                    }
                    className="text-blue-600 text-sm underline flex items-center gap-1 mx-auto hover:text-blue-800 transition"
                  >
                    <ExternalLink className="w-4 h-4" /> ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSetStartPosition}
                  disabled={!detectedStartLat || !detectedStartLng}
                  className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-600 disabled:opacity-50 transition"
                >
                  บันทึก
                </button>
                <button
                  onClick={clearStartPosition}
                  className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition"
                >
                  ล้าง
                </button>
              </div>
            </div>
          </div>
        )}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto text-gray-800">
              <div className="flex justify-between items-center mb-5 sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">ดึงงานค้าง</h2>
                  <button
                    onClick={clearAllPending}
                    className="text-red-600 underline font-medium hover:text-red-800"
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
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
                        {formatThaiShortDate(pd.original_date)}
                      </p>
                      <p className="text-sm text-gray-600">
                        มี {pd.count} รายการ
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => clearPendingForDate(pd.original_date)}
                        className="text-red-600 underline font-medium hover:text-red-800"
                      >
                        ล้างวันนี้
                      </button>
                      <button
                        onClick={() => loadPendingAndResort(pd.original_date)}
                        className="text-blue-600 underline font-medium hover:text-blue-800"
                      >
                        ดึงมาใช้
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
