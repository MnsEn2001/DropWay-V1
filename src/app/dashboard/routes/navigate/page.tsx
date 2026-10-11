// src/app/dashboard/routes/navigate/page.tsx
"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Navigation,
  RefreshCw,
  MapPin,
  Copy,
  Search,
  Flag,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Map as MapIcon,
  Trash2,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";

interface House {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  order_index: number;
  created_at: string;
  updated_at: string | null;
}

interface ReportedHouse {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  report_reason: string;
  reported_at: string;
}

interface TodayHouseRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | string | null;
  lng: number | string | null;
  note: string | null;
  order_index: number | string;
  created_at: string;
  updated_at: string | null;
}

interface Coords {
  lat: number;
  lng: number;
}

interface SortableRow {
  id: string;
  lat: number | null;
  lng: number | null;
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

/**
 * เรียงลำดับจุดส่งตามระยะทางจากจุดเริ่มต้น (Vincenty) + จัดคลัสเตอร์บ้านใกล้กัน
 * — คงอัลกอริทึมเดิมไว้ทั้งหมด แยกเป็นฟังก์ชัน generic เพื่อลด any
 */
function orderRows<T extends SortableRow>(
  rows: T[],
  origin: Coords,
  distanceOf: (a: Coords, b: Coords) => number,
  opts: { groupNearby: boolean; restComparator?: (a: T, b: T) => number },
): T[] {
  const withCoords = rows.filter(
    (r): r is T & { lat: number; lng: number } =>
      r.lat !== null && r.lng !== null,
  );
  const decorated = withCoords.map((row) => ({
    row,
    dist: distanceOf(origin, { lat: row.lat, lng: row.lng }),
  }));
  decorated.sort((a, b) => a.dist - b.dist);

  let ordered = decorated;
  if (opts.groupNearby && ordered.length > 1) {
    const clusters: (typeof decorated)[] = [];
    const used = new Set<number>();
    const threshold = 0.5;
    for (let i = 0; i < ordered.length; i++) {
      if (used.has(i)) continue;
      const cluster = [ordered[i]];
      used.add(i);
      for (let j = i + 1; j < ordered.length; j++) {
        if (used.has(j)) continue;
        const d = distanceOf(ordered[i].row, ordered[j].row);
        if (d <= threshold) {
          cluster.push(ordered[j]);
          used.add(j);
        }
      }
      clusters.push(cluster);
    }
    clusters.sort((a, b) => a[0].dist - b[0].dist);
    ordered = clusters.flat();
  }

  const rest = rows.filter((r) => r.lat === null || r.lng === null);
  if (opts.restComparator) rest.sort(opts.restComparator);

  return [...ordered.map((d) => d.row), ...rest];
}

export default function NavigatePage() {
  const { toast: addToast } = useToast();

  // ──────────────────────── State ────────────────────────
  const [houses, setHouses] = useState<House[]>([]);
  const [reportedHouses, setReportedHouses] = useState<ReportedHouse[]>([]);
  const [pendingDates, setPendingDates] = useState<
    { original_date: string; count: number }[]
  >([]);
  const [currentPosition, setCurrentPosition] = useState<Coords | null>(null);
  // ใช้ ref เพราะค่าถูกอ่านใน watchPosition callback เท่านั้น (ไม่ต้อง re-render)
  const useManualCurrentRef = useRef(false);

  // แยกจุดเริ่มต้นตามแถบ
  const [todayStartPosition, setTodayStartPosition] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [reportedStartPosition, setReportedStartPosition] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);

  const [sorting, setSorting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "reported">("today");

  // Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // รายงาน
  const [reportingHouse, setReportingHouse] = useState<House | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // กรอง
  const [reportReasonFilter, setReportReasonFilter] = useState<string>("");
  const reportReasons = [
    "โทรไม่รับ",
    "ไม่อยู่บ้าน",
    "เบอร์ติดต่อไม่ได้",
    "ที่อยู่ไม่ถูกต้อง",
    "ปฏิเสธรับสินค้า",
    "อื่นๆ",
  ];

  // Manual coord
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

  // สำหรับ modal จุดเริ่มต้น (รู้ว่าเปิดจากแถบไหน)
  const [startPositionModalType, setStartPositionModalType] = useState<
    "today" | "reported" | null
  >(null);

  // Refs
  const shouldResortRef = useRef(false);
  const isSortingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // ──────────────────────── Computed ────────────────────────
  const activeStartPosition =
    activeTab === "today" ? todayStartPosition : reportedStartPosition;

  const totalPending = useMemo(
    () => pendingDates.reduce((s, i) => s + i.count, 0),
    [pendingDates],
  );

  const { filteredHouses, filterDescription } = useMemo(() => {
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
    return { filteredHouses: result, filterDescription: desc };
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

  const displayedHouses = useMemo(() => {
    return filteredHouses.filter((h) =>
      searchQuery
        ? h.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.phone.includes(searchQuery) ||
          h.address.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    );
  }, [filteredHouses, searchQuery]);

  const filteredReportedHouses = useMemo(() => {
    return reportedHouses.filter((h) => {
      const matchesSearch =
        searchQuery === "" ||
        h.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.phone.includes(searchQuery) ||
        h.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.report_reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        reportReasonFilter === "" || h.report_reason === reportReasonFilter;
      return matchesSearch && matchesFilter;
    });
  }, [reportedHouses, searchQuery, reportReasonFilter]);

  const activeFilterCount =
    activeTab === "today"
      ? [houseNumberFilter, showNoCoords ? "1" : "", showWithCoords ? "1" : ""]
          .filter(Boolean).length
      : [reportReasonFilter].filter(Boolean).length;

  // ──────────────────────── Core Functions ────────────────────────
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์แล้ว", "success");
    } catch {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
  };

  const detectLocation = async (forStart = false) => {
    if (!navigator.geolocation) {
      addToast("เบราว์เซอร์ไม่รองรับ GPS", "error");
      return;
    }

    addToast("กำลังหาตำแหน่งของคุณ...", "info");

    // วนลูปจนกว่าจะได้ตำแหน่ง หรือผู้ใช้ยกเลิก
    let attempts = 0;
    const maxAttempts = 5; // ลองสูงสุด 5 ครั้ง

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const pos = await new Promise<Coords>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("timeout"));
          }, 12000); // รอสูงสุด 12 วินาทีต่อครั้ง

          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId);
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (err) => {
              clearTimeout(timeoutId);
              reject(err);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000, // ใช้ตำแหน่งเก่าได้ถ้าอายุไม่เกิน 1 นาที
            },
          );
        });

        // สำเร็จแล้ว!
        if (forStart) {
          setDetectedStartLat(pos.lat);
          setDetectedStartLng(pos.lng);
          setStartCoordInput(`${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`);
        } else {
          setDetectedLat(pos.lat);
          setDetectedLng(pos.lng);
          setManualCoordInput(`${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`);
        }

        addToast(`ตรวจจับตำแหน่งสำเร็จ! (ครั้งที่ ${attempts})`, "success");
        return;
      } catch {
        // ถ้ายังไม่ถึงครั้งสุดท้าย → รอ 2 วินาทีแล้วลองใหม่
        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000));
          addToast(`กำลังลองครั้งที่ ${attempts + 1}...`, "info");
        } else {
          // ครั้งสุดท้ายแล้วยังไม่ได้
          addToast(
            "ไม่สามารถหาตำแหน่งได้ กรุณาเปิด GPS แล้วลองอีกครั้ง",
            "error",
          );
        }
      }
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
    useManualCurrentRef.current = true;
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

    const name = startNameInput || "จุดเริ่มต้น";
    const newPos = { lat: detectedStartLat, lng: detectedStartLng, name };

    try {
      if (startPositionModalType === "today") {
        await supabase.rpc("save_start_position", {
          p_lat: detectedStartLat,
          p_lng: detectedStartLng,
          p_name: startNameInput || undefined,
        });
        setTodayStartPosition(newPos);
        localStorage.setItem("todayStartPosition", JSON.stringify(newPos));
      } else {
        setReportedStartPosition(newPos);
        localStorage.setItem("reportedStartPosition", JSON.stringify(newPos));
      }

      addToast(
        `ตั้งจุดเริ่มต้น${startPositionModalType === "today" ? "วันนี้" : "รายงานแล้ว"}แล้ว`,
        "success",
      );
      setShowStartModal(false);
      setStartNameInput("");
      shouldResortRef.current = true;
    } catch (e) {
      addToast(
        `บันทึกไม่สำเร็จ: ${e instanceof Error ? e.message : "กรุณาลองใหม่"}`,
        "error",
      );
    }
  };

  const clearStartPosition = async () => {
    if (startPositionModalType === "today") {
      await supabase.rpc("clear_start_position");
      localStorage.removeItem("todayStartPosition");
      setTodayStartPosition(null);
    } else {
      localStorage.removeItem("reportedStartPosition");
      setReportedStartPosition(null);
    }
    addToast("ล้างจุดเริ่มต้นแล้ว", "success");
    shouldResortRef.current = true;
  };

  const loadStartPosition = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("get_start_position");
      const sp = data?.[0] || null;
      if (sp) {
        setTodayStartPosition({
          lat: sp.lat,
          lng: sp.lng,
          name: sp.name || undefined,
        });
      } else {
        const saved = localStorage.getItem("todayStartPosition");
        if (saved) setTodayStartPosition(JSON.parse(saved));
      }

      const savedReported = localStorage.getItem("reportedStartPosition");
      if (savedReported) setReportedStartPosition(JSON.parse(savedReported));

      shouldResortRef.current = true;
    } catch {}
  }, []);

  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) =>
      vincentyDistance(lat1, lng1, lat2, lng2),
    [],
  );

  const loadReportedHouses = async () => {
    try {
      const { data } = await supabase
        .from("reported_houses")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .order("reported_at", { ascending: false });
      setReportedHouses((data as ReportedHouse[] | null) ?? []);
    } catch (err) {
      console.error("Error loading reported houses:", err);
    }
  };

  const refreshData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data } = await supabase.rpc("refresh_and_merge_today_houses");
      const rows = (data ?? []) as TodayHouseRow[];
      setHouses(
        rows.map((h) => ({
          id: h.id,
          user_id: h.user_id,
          full_name: h.full_name,
          phone: h.phone,
          address: h.address,
          lat: h.lat ? Number(h.lat) : null,
          lng: h.lng ? Number(h.lng) : null,
          note: h.note ?? null,
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
      const rows = (pending ?? []) as { original_date: string }[];
      const map = new Map<string, number>();
      rows.forEach((r) =>
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

    await loadReportedHouses();
    shouldResortRef.current = true;
  }, []);

  const reportHouse = async () => {
    if (!reportingHouse) return;
    if (!reportReason && !customReason)
      return addToast("กรุณาเลือกหรือกรอกเหตุผล", "error");
    const reason =
      reportReason === "อื่นๆ" ? customReason.trim() : reportReason;
    if (reportReason === "อื่นๆ" && !reason)
      return addToast("กรุณากรอกเหตุผลเมื่อเลือก 'อื่นๆ'", "error");

    try {
      await supabase.from("reported_houses").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        full_name: reportingHouse.full_name,
        phone: reportingHouse.phone,
        address: reportingHouse.address,
        lat: reportingHouse.lat,
        lng: reportingHouse.lng,
        note: reportingHouse.note,
        report_reason: reason,
      });
      await supabase.from("today_houses").delete().eq("id", reportingHouse.id);
      setHouses((prev) => prev.filter((h) => h.id !== reportingHouse.id));
      addToast("รายงานสำเร็จ", "success");
      if (activeTab === "reported") loadReportedHouses();
    } catch {
      addToast("รายงานไม่สำเร็จ", "error");
    } finally {
      setShowReportModal(false);
      setReportingHouse(null);
      setReportReason("");
      setCustomReason("");
    }
  };

  const reSortHouses = useCallback(async () => {
    if (isSortingRef.current) return;
    const origin = activeStartPosition || currentPosition || DEFAULT_POSITION;
    const distanceOf = (a: Coords, b: Coords) =>
      calculateDistance(a.lat, a.lng, b.lat, b.lng);

    if (activeTab === "today") {
      if (houses.length === 0) return;
      isSortingRef.current = true;
      const final = orderRows(houses, origin, distanceOf, {
        groupNearby: groupNearbyHouses,
      });
      // สำคัญ: ใช้ requestAnimationFrame เพื่อป้องกัน loop
      requestAnimationFrame(() => {
        Promise.all(
          final.map((h, i) =>
            supabase
              .from("today_houses")
              .update({ order_index: i + 1 })
              .eq("id", h.id),
          ),
        )
          .then(() => {
            setHouses(final);
          })
          .catch(() => {
            addToast("เรียงลำดับวันนี้ไม่สำเร็จ", "error");
          })
          .finally(() => {
            isSortingRef.current = false;
          });
      });
    } else {
      if (reportedHouses.length === 0) return;
      isSortingRef.current = true;
      const final = orderRows(reportedHouses, origin, distanceOf, {
        groupNearby: groupNearbyHouses,
        restComparator: (a, b) =>
          (a.report_reason || "").localeCompare(b.report_reason || ""),
      });
      requestAnimationFrame(() => {
        setReportedHouses(final);
        isSortingRef.current = false;
      });
    }
  }, [
    activeTab,
    houses,
    reportedHouses,
    activeStartPosition,
    currentPosition,
    calculateDistance,
    groupNearbyHouses,
    addToast,
  ]);

  const openFullRouteOnMaps = useCallback(() => {
    const origin = activeStartPosition || currentPosition || DEFAULT_POSITION;
    const housesToUse = activeTab === "today" ? houses : reportedHouses;

    const valid = housesToUse
      .filter(
        (h): h is (typeof housesToUse)[number] & { lat: number; lng: number } =>
          h.lat !== null && h.lng !== null,
      )
      .map((h) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat, h.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20);

    if (valid.length === 0) return addToast("ไม่มีบ้านที่มีพิกัด", "error");

    const points = [
      origin,
      ...valid.map((h) => ({ lat: h.lat, lng: h.lng })),
    ];
    const url = `https://www.google.com/maps/dir/${points.map((p) => `${p.lat},${p.lng}`).join("/")}`;
    window.open(url, "_blank");
    addToast(
      `เปิดเส้นทาง ${valid.length} จุด (${activeTab === "today" ? "วันนี้" : "รายงานแล้ว"})`,
      "success",
    );
  }, [
    activeTab,
    houses,
    reportedHouses,
    activeStartPosition,
    currentPosition,
    calculateDistance,
    addToast,
  ]);

  const markDelivered = async (id: string) => {
    if (!confirm("ยืนยันส่งแล้ว?")) return;
    try {
      const { error } = await supabase
        .from("today_houses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      addToast("ส่งแล้ว ลบสำเร็จ", "success");
      window.location.reload();
    } catch {
      addToast("เกิดข้อผิดพลาด ไม่สามารถลบได้", "error");
    }
  };

  const openMaps = (lat: number, lng: number) => {
    const origin = activeStartPosition || currentPosition || DEFAULT_POSITION;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };

  const forceRefreshLocationAndSort = async () => {
    setSorting(true);
    try {
      const pos = await new Promise<Coords>((res, rej) => {
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
          rej,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          },
        );
      });
      setCurrentPosition(pos);
      useManualCurrentRef.current = false;
      addToast("รีเฟรช GPS สำเร็จ", "success");
      shouldResortRef.current = true;
    } catch {
      addToast("รีเฟรชไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
    }
  };

  const deleteAllInCurrentTab = async () => {
    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในแท็บ "${activeTab === "today" ? "วันนี้" : "รายงานแล้ว"}"?`,
      )
    )
      return;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("ไม่พบผู้ใช้");

      if (activeTab === "today") {
        await supabase.from("today_houses").delete().eq("user_id", userId);
        addToast("ลบงานวันนี้ทั้งหมดแล้ว", "success");
      } else {
        await supabase.from("reported_houses").delete().eq("user_id", userId);
        setReportedHouses([]);
        addToast("ลบรายงานทั้งหมดแล้ว", "success");
      }
      window.location.reload();
    } catch (err) {
      addToast(
        `ลบไม่สำเร็จ: ${err instanceof Error ? err.message : "กรุณาลองใหม่"}`,
        "error",
      );
    }
  };

  const deleteReportedHouse = async (id: string) => {
    if (!confirm("ยืนยันลบรายการนี้?")) return;
    try {
      await supabase.from("reported_houses").delete().eq("id", id);
      setReportedHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("ลบรายการสำเร็จ", "success");
    } catch {
      addToast("ลบไม่สำเร็จ", "error");
    }
  };

  const openStartModal = () => {
    setStartPositionModalType(activeTab);
    setShowStartModal(true);
  };

  // ──────────────────────── Effects ────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await refreshData();
      await loadStartPosition();
      try {
        const pos = await new Promise<Coords>((res, rej) => {
          navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
            rej,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 10000,
            },
          );
        });
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
          if (!useManualCurrentRef.current) {
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
  }, [refreshData, loadStartPosition]);

  useEffect(() => {
    if (activeTab !== "reported") return;
    let cancelled = false;
    const loadReported = async () => {
      try {
        const { data } = await supabase
          .from("reported_houses")
          .select("*")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .order("reported_at", { ascending: false });
        if (!cancelled)
          setReportedHouses((data as ReportedHouse[] | null) ?? []);
      } catch (err) {
        console.error("Error loading reported houses:", err);
      }
    };
    loadReported();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      reSortHouses();
    }, 100); // ดีเลย์เล็กน้อย ป้องกันการเรียกพร้อมกัน
    return () => clearTimeout(timer);
  }, [
    activeTab,
    activeStartPosition,
    currentPosition,
    groupNearbyHouses,
    loading,
    reSortHouses,
  ]);

  // ──────────────────────── Render ────────────────────────
  if (loading) {
    return <LoadingState fullPage label="กำลังโหลดคิวส่งของ..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                <Navigation
                  className="size-5 shrink-0 text-primary-600"
                  aria-hidden="true"
                />
                นำทางส่งของ
              </h1>
              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                {activeTab === "today"
                  ? filterDescription
                  : `รายงานแล้ว ${filteredReportedHouses.length} รายการ`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Tooltip label={activeStartPosition ? "แก้จุดเริ่มต้น" : "ตั้งจุดเริ่มต้น"}>
                <Button
                  variant={activeStartPosition ? "outline" : "secondary"}
                  size="icon"
                  aria-label={activeStartPosition ? "แก้จุดเริ่มต้น" : "ตั้งจุดเริ่มต้น"}
                  onClick={openStartModal}
                >
                  <Flag className="size-4" aria-hidden="true" />
                </Button>
              </Tooltip>
              <Tooltip label="รีเฟรช GPS และเรียงเส้นทางใหม่">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="รีเฟรช GPS และเรียงเส้นทางใหม่"
                  onClick={forceRefreshLocationAndSort}
                >
                  <RefreshCw
                    className={`size-4 ${sorting ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </Button>
              </Tooltip>
              <Button
                onClick={openFullRouteOnMaps}
                aria-label="เปิดเส้นทางทั้งหมด (สูงสุด 20 จุด) ใน Google Maps"
              >
                <MapIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">เส้นทางทั้งหมด</span>
              </Button>
              <Tooltip label="ลบทั้งหมดในแท็บนี้">
                <Button
                  variant="ghost-danger"
                  size="icon"
                  aria-label="ลบทั้งหมดในแท็บนี้"
                  onClick={deleteAllInCurrentTab}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs
              label="เลือกแท็บงาน"
              className="sm:w-80"
              value={activeTab}
              onChange={(value) => setActiveTab(value as "today" | "reported")}
              items={[
                {
                  value: "today",
                  label: "วันนี้",
                  count: displayedHouses.length,
                },
                {
                  value: "reported",
                  label: "รายงานแล้ว",
                  count: filteredReportedHouses.length,
                },
              ]}
            />
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                label="ค้นหารายการ"
                hideLabel
                placeholder={`ค้นหา ${activeTab === "today" ? "ชื่อ, เบอร์, ที่อยู่" : "ชื่อ, เบอร์, ที่อยู่, เหตุผล"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                aria-label="เปิดตัวกรอง"
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Filter className="size-4" aria-hidden="true" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* GPS Warning */}
        {activeTab === "today" && isUsingDefault && !todayStartPosition && (
          <Alert
            variant="warning"
            title="กำลังรอสัญญาณ GPS"
            className="mb-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span>ตำแหน่งปัจจุบันอาจไม่แม่นยำ</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowManualModal(true)}
              >
                ตั้งตำแหน่งเอง
              </Button>
            </div>
          </Alert>
        )}

        {/* Pending */}
        {activeTab === "today" && totalPending > 0 && (
          <Alert variant="info" className="mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span>มีงานค้างจากวันก่อน {totalPending} รายการ</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPendingModal(true)}
              >
                ดึงงานค้างเข้าคิว
              </Button>
            </div>
          </Alert>
        )}

        {activeTab === "today" ? (
          displayedHouses.length === 0 ? (
            searchQuery || activeFilterCount > 0 ? (
              <EmptyState
                icon={Search}
                title="ไม่พบรายการที่ตรงกับเงื่อนไข"
                description="ลองปรับคำค้นหา หรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setHouseNumberFilter("");
                      setShowNoCoords(false);
                      setShowWithCoords(false);
                    }}
                  >
                    ล้างคำค้นหาและตัวกรอง
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Navigation}
                title="ยังไม่มีรายการส่งของวันนี้"
                description="เพิ่มบ้านจากคลังบ้านเข้าคิววันนี้ หรือดึงงานค้างจากวันก่อน"
                action={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href="/dashboard/houses"
                      className={buttonClasses("primary", "md")}
                    >
                      ไปที่คลังบ้าน
                    </Link>
                    {totalPending > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => setShowPendingModal(true)}
                      >
                        ดึงงานค้าง ({totalPending})
                      </Button>
                    )}
                  </div>
                }
              />
            )
          ) : (
            <ul className="space-y-4">
              {displayedHouses.map((house) => {
                const origin =
                  activeStartPosition || currentPosition || DEFAULT_POSITION;
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
                  <li key={house.id}>
                    <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-700">
                              #{house.order_index}
                            </span>
                            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                              {house.full_name}
                            </h2>
                          </div>
                          <Tooltip label="รายงานปัญหา">
                            <Button
                              variant="ghost-danger"
                              size="icon-sm"
                              aria-label={`รายงานปัญหาบ้าน ${house.full_name}`}
                              onClick={() => {
                                setReportingHouse(house);
                                setShowReportModal(true);
                              }}
                            >
                              <AlertTriangle
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </Tooltip>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-sm text-slate-600">
                            {house.phone}
                          </span>
                          <Tooltip label="คัดลอกเบอร์โทร">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="คัดลอกเบอร์โทร"
                              onClick={() => copyPhone(house.phone)}
                            >
                              <Copy className="size-3.5" aria-hidden="true" />
                            </Button>
                          </Tooltip>
                        </div>

                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {house.address}
                        </p>

                        {house.note?.trim() && (
                          <p className="mt-1 text-xs italic text-warning-700">
                            หมายเหตุ: {house.note.trim()}
                          </p>
                        )}

                        {distance !== null && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin
                              className="size-3.5 text-primary-500"
                              aria-hidden="true"
                            />
                            ระยะทางโดยประมาณ{" "}
                            <span className="font-semibold text-primary-600">
                              {distance.toFixed(1)} กม.
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 border-t border-slate-100 p-4 pt-3 sm:px-5">
                        {house.lat && house.lng ? (
                          <Button
                            variant="success"
                            className="flex-1"
                            onClick={() => openMaps(house.lat!, house.lng!)}
                          >
                            <Navigation
                              className="size-4"
                              aria-hidden="true"
                            />
                            นำทาง
                          </Button>
                        ) : (
                          <div className="flex flex-1 items-center justify-center rounded-lg bg-slate-100 px-3 text-center text-sm text-slate-500">
                            ไม่มีพิกัด
                          </div>
                        )}

                        <Button
                          className="flex-1"
                          onClick={() => markDelivered(house.id)}
                        >
                          <CheckCircle2
                            className="size-4"
                            aria-hidden="true"
                          />
                          ส่งแล้ว
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )
        ) : filteredReportedHouses.length === 0 ? (
          searchQuery || activeFilterCount > 0 ? (
            <EmptyState
              icon={Search}
              title="ไม่พบรายการที่ตรงกับเงื่อนไข"
              description="ลองปรับคำค้นหา หรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setReportReasonFilter("");
                  }}
                >
                  ล้างคำค้นหาและตัวกรอง
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="ยังไม่มีรายการที่รายงาน"
              description="เมื่อรายงานปัญหาจากแท็บวันนี้ รายการจะมาแสดงที่นี่"
            />
          )
        ) : (
          <ul className="space-y-4">
            {filteredReportedHouses.map((house) => {
              const origin =
                activeStartPosition || currentPosition || DEFAULT_POSITION;
              const distance =
                house.lat && house.lng
                  ? calculateDistance(
                      origin.lat,
                      origin.lng,
                      house.lat,
                      house.lng,
                    )
                  : null;

              const reportedDate = new Date(house.reported_at);
              const timeStr = reportedDate.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const dateStr = formatThaiShortDate(house.reported_at);

              return (
                <li key={house.id}>
                  <Card className="overflow-hidden border-danger-100 transition-shadow hover:shadow-card-hover">
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                            {house.full_name}
                          </h2>
                          <div className="mt-1.5">
                            <StatusBadge status="PROBLEM" withIcon />
                          </div>
                        </div>
                        <Tooltip label="ลบรายการนี้">
                          <Button
                            variant="ghost-danger"
                            size="icon-sm"
                            aria-label={`ลบรายการของ ${house.full_name}`}
                            onClick={() => deleteReportedHouse(house.id)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </Tooltip>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-sm text-slate-600">
                          {house.phone}
                        </span>
                        <Tooltip label="คัดลอกเบอร์โทร">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="คัดลอกเบอร์โทร"
                            onClick={() => copyPhone(house.phone)}
                          >
                            <Copy className="size-3.5" aria-hidden="true" />
                          </Button>
                        </Tooltip>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {house.address}
                      </p>

                      {house.note?.trim() && (
                        <p className="mt-1 text-xs italic text-warning-700">
                          หมายเหตุ: {house.note.trim()}
                        </p>
                      )}

                      {distance !== null && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin
                            className="size-3.5 text-primary-500"
                            aria-hidden="true"
                          />
                          ระยะทางโดยประมาณ{" "}
                          <span className="font-semibold text-primary-600">
                            {distance.toFixed(1)} กม.
                          </span>
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Badge tone="danger">{house.report_reason}</Badge>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="size-3.5" aria-hidden="true" />
                          รายงานเมื่อ {timeStr} น. | {dateStr}
                        </span>
                      </div>
                    </div>

                    {house.lat && house.lng && (
                      <div className="border-t border-slate-100 p-4 pt-3 sm:px-5">
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => openMaps(house.lat!, house.lng!)}
                        >
                          <Navigation className="size-4" aria-hidden="true" />
                          เปิดใน Google Maps
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal รายงานปัญหา */}
      <Modal
        open={showReportModal && reportingHouse !== null}
        onClose={() => {
          setShowReportModal(false);
          setReportingHouse(null);
          setReportReason("");
          setCustomReason("");
        }}
        title="รายงานปัญหา"
        description={
          reportingHouse
            ? `${reportingHouse.full_name} — ${reportingHouse.phone}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowReportModal(false);
                setReportingHouse(null);
                setReportReason("");
                setCustomReason("");
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={reportHouse}
            >
              ยืนยันรายงาน
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="เหตุผล"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          >
            <option value="">เลือกเหตุผล</option>
            {reportReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {reportReason === "อื่นๆ" && (
            <Input
              label="ระบุเหตุผล"
              placeholder="พิมพ์เหตุผล..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
        </div>
      </Modal>

      {/* Modal ตัวกรอง */}
      <Modal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="ตัวกรอง"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                if (activeTab === "today") {
                  setHouseNumberFilter("");
                  setShowNoCoords(false);
                  setShowWithCoords(false);
                  setGroupByHouseNumber(false);
                } else {
                  setReportReasonFilter("");
                }
                setShowFilterModal(false);
              }}
            >
              ล้าง
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowFilterModal(false)}
            >
              ใช้ตัวกรอง
            </Button>
          </>
        }
      >
        {activeTab === "today" ? (
          <div className="space-y-2">
            <Input
              label="บ้านเลขที่"
              placeholder="เช่น 15/8"
              value={houseNumberFilter}
              onChange={(e) => setHouseNumberFilter(e.target.value)}
            />
            <div className="space-y-1 pt-1">
              <Checkbox
                label="ไม่มีพิกัด"
                checked={showNoCoords}
                onChange={(e) => {
                  setShowNoCoords(e.target.checked);
                  setShowWithCoords(false);
                }}
              />
              <Checkbox
                label="มีพิกัดแล้ว"
                checked={showWithCoords}
                onChange={(e) => {
                  setShowWithCoords(e.target.checked);
                  setShowNoCoords(false);
                }}
              />
              <Checkbox
                label="จัดกลุ่มตามบ้านเลขที่"
                checked={groupByHouseNumber}
                onChange={(e) => setGroupByHouseNumber(e.target.checked)}
              />
              <Checkbox
                label="จัดกลุ่มบ้านใกล้กัน (500 ม.)"
                checked={groupNearbyHouses}
                onChange={(e) => {
                  setGroupNearbyHouses(e.target.checked);
                  shouldResortRef.current = true;
                }}
              />
            </div>
          </div>
        ) : (
          <Select
            label="เหตุผลที่รายงาน"
            value={reportReasonFilter}
            onChange={(e) => setReportReasonFilter(e.target.value)}
          >
            <option value="">ทุกเหตุผล</option>
            {reportReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}
      </Modal>

      {/* Modal งานค้าง */}
      <Modal
        open={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        title="งานค้างจากวันก่อน"
        description="ดึงงานค้างเข้าคิวของวันนี้ หรือล้างทิ้งเป็นรายวัน"
      >
        {pendingDates.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="ไม่มีงานค้าง"
            description="ทุกงานถูกดึงเข้าคิวหรือส่งครบแล้ว"
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {pendingDates.map((pd) => (
              <li
                key={pd.original_date}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {formatThaiShortDate(pd.original_date)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                    {pd.count} รายการ
                    <StatusBadge status="PENDING" />
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    onClick={() =>
                      supabase
                        .from("pending_houses")
                        .delete()
                        .eq("original_date", pd.original_date)
                    }
                  >
                    ล้าง
                  </Button>
                  <Button
                    size="sm"
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
                  >
                    ดึงมา
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Modal ตั้งจุดเริ่มต้น */}
      <Modal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        title={`ตั้งจุดเริ่มต้น (${startPositionModalType === "today" ? "วันนี้" : "รายงานแล้ว"})`}
        description="ใช้เป็นจุดแรกในการคำนวณลำดับเส้นทาง"
        footer={
          <>
            <Button
              variant="danger"
              className="flex-1"
              onClick={clearStartPosition}
            >
              ล้างจุดเริ่มต้น
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={handleSetStartPosition}
            >
              ตั้งค่า
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="ชื่อจุด (ไม่บังคับ)"
            placeholder="เช่น บ้าน, โรงเก็บของ"
            value={startNameInput}
            onChange={(e) => setStartNameInput(e.target.value)}
          />
          <Input
            label="พิกัด (ละติจูด,ลองจิจูด)"
            placeholder="เช่น 16.8833,99.125"
            value={startCoordInput}
            onChange={(e) => {
              setStartCoordInput(e.target.value);
              const parts = e.target.value
                .split(",")
                .map((p) => parseFloat(p.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setDetectedStartLat(parts[0]);
                setDetectedStartLng(parts[1]);
              } else {
                setDetectedStartLat(null);
                setDetectedStartLng(null);
              }
            }}
          />
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => detectLocation(true)}
          >
            <MapPin className="size-4" aria-hidden="true" />
            ตรวจจับตำแหน่งปัจจุบัน
          </Button>
        </div>
      </Modal>

      {/* Modal ตั้งตำแหน่งด้วยมือ */}
      <Modal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        title="ตั้งตำแหน่งด้วยมือ"
        description="ใช้เมื่อสัญญาณ GPS ไม่พร้อมใช้งาน"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowManualModal(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={setManualPosition}
            >
              ตั้งค่า
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="พิกัด (ละติจูด,ลองจิจูด)"
            placeholder="เช่น 16.8833,99.125"
            value={manualCoordInput}
            onChange={(e) => {
              setManualCoordInput(e.target.value);
              const parts = e.target.value
                .split(",")
                .map((p) => parseFloat(p.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setDetectedLat(parts[0]);
                setDetectedLng(parts[1]);
              } else {
                setDetectedLat(null);
                setDetectedLng(null);
              }
            }}
          />
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => detectLocation(false)}
          >
            <MapPin className="size-4" aria-hidden="true" />
            ตรวจจับตำแหน่งปัจจุบัน
          </Button>
        </div>
      </Modal>
    </div>
  );
}
