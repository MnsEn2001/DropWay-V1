// src/app/dashboard/houses/page.tsx
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  Navigation,
  MapPin,
  Loader2,
  Edit3,
  Trash2,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileSpreadsheet,
  FileText,
  Copy,
  Download,
  Package,
} from "lucide-react";
import Papa from "papaparse";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";

interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  created_at: string;
  updated_at: string | null;
}

interface CsvRow {
  full_name?: string;
  name?: string;
  ชื่อ?: string;
  phone?: string;
  เบอร์?: string;
  address?: string;
  ที่อยู่?: string;
  note?: string;
  หมายเหตุ?: string;
  [key: string]: string | undefined;
}

const ITEMS_PER_PAGE = 20;

// ข้อมูลหมู่บ้านตามตำบล
const villageBySubdistrict: Record<string, string[]> = {
  นาโบสถ์: [
    "ลาดยาว",
    "นาโบสถ์",
    "วังตำลึง",
    "ตะเคียนด้วน",
    "วังน้ำเย็น",
    "นาแพะ",
    "ท่าทองแดง",
    "เพชรชมภู",
    "ใหม่พรสวรรค์",
  ],
  เชียงทอง: [
    "วังเจ้า",
    "เด่นวัว",
    "เด่นคา",
    "หนองปลาไหล",
    "ครองราชย์",
    "เด่นวัวน้ำทิพย์",
    "ชุมนุมกลาง",
    "สบยม",
    "ดงซ่อม",
    "ใหม่เสรีธรรม",
    "ใหม่ชัยมงคล",
    "สบยมใต้",
    "ผาผึ้ง",
    "ศรีคีรีรักษ์",
  ],
  ประดาง: ["ทุ่งกง", "คลองเชียงทอง", "ประดาง", "โตงเตง", "ท่าตะคร้อ"],
};

const subdistricts = ["นาโบสถ์", "เชียงทอง", "ประดาง"];
const villages = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

export default function HousesPage() {
  const { toast: addToast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"list" | "csv">(
    searchParams.get("tab") === "csv" ? "csv" : "list",
  );
  const [houses, setHouses] = useState<House[]>([]);
  const [fetching, setFetching] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [showNoCoords, setShowNoCoords] = useState(false);
  const [showWithCoords, setShowWithCoords] = useState(false);
  const [groupByHouseNumber, setGroupByHouseNumber] = useState(false);
  const [groupByNearby, setGroupByNearby] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCsvExample, setShowCsvExample] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);

  // ฟอร์ม
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [coordInput, setCoordInput] = useState("");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Dropdown state
  const [showMooDropdown, setShowMooDropdown] = useState(false);
  const [showSubdistrictDropdown, setShowSubdistrictDropdown] = useState(false);
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  const reload = () => setReloadKey((prev) => prev + 1);

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์โทรแล้ว", "success");
    } catch {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setLoadFailed(true);
        addToast("โหลดคลังบ้านไม่สำเร็จ: " + error.message, "error");
      } else {
        setLoadFailed(false);
        setHouses((data as House[]) ?? []);
      }
      setFetching(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, addToast]);

  const extractHouseNumber = (address: string): string => {
    const match = address.match(
      /(?:บ้านเลขที่|เลขที่|ที่\s*)?\s*([\d\/\\-]+)\s*(?:\/\s*\d+)?/i,
    );
    return match ? match[1].trim() : "";
  };

  const extractVillageNumber = (address: string): string => {
    const match =
      address.match(/หมู่\s*[ที่]?\s*(\d+)/i) ||
      address.match(/ม\s*\.?\s*(\d+)/i);
    return match ? match[1] : "";
  };

  const extractSubdistrict = (address: string): string => {
    const match = address.match(/ต\.\s*([\u0E00-\u0E7F]+)/);
    return match ? match[1] : "";
  };

  const filteredAndSorted = useMemo(() => {
    const result = houses.filter((h) => {
      const lowerSearch = search.toLowerCase().trim();
      const addr = h.address.toLowerCase();
      const fullName = h.full_name.toLowerCase();
      const phoneStr = h.phone;
      const houseNum = extractHouseNumber(h.address);
      const villageNum = extractVillageNumber(h.address);
      const subdistrict = extractSubdistrict(h.address);
      const noteLower = (h.note || "").toLowerCase();

      const matchesText =
        fullName.includes(lowerSearch) ||
        phoneStr.includes(lowerSearch) ||
        addr.includes(lowerSearch) ||
        noteLower.includes(lowerSearch) ||
        houseNum.includes(lowerSearch) ||
        villageNum.includes(lowerSearch) ||
        subdistrict.includes(lowerSearch);

      const matchesCoords =
        h.lat &&
        h.lng &&
        lowerSearch.includes(h.lat.toFixed(2)) &&
        lowerSearch.includes(h.lng.toFixed(2));

      if (lowerSearch && !matchesText && !matchesCoords) return false;
      if (
        houseNumberFilter.trim() &&
        !houseNum.includes(houseNumberFilter.trim())
      )
        return false;
      if (phoneFilter.trim() && !phoneStr.includes(phoneFilter.trim()))
        return false;
      if (provinceFilter.trim()) {
        const p = provinceFilter.toLowerCase().trim();
        if (
          !addr.includes(`จ.${p}`) &&
          !addr.includes(`จังหวัด${p}`) &&
          !addr.includes(p)
        )
          return false;
      }
      if (districtFilter.trim()) {
        const d = districtFilter.toLowerCase().trim();
        if (
          !addr.includes(`อ.${d}`) &&
          !addr.includes(`อำเภอ${d}`) &&
          !addr.includes(d)
        )
          return false;
      }
      if (subdistrictFilter.trim()) {
        const t = subdistrictFilter.toLowerCase().trim();
        if (
          !addr.includes(`ต.${t}`) &&
          !addr.includes(`ตำบล${t}`) &&
          !addr.includes(t)
        )
          return false;
      }
      if (villageFilter.trim() && villageNum !== villageFilter.trim())
        return false;

      const hasCoords = h.lat && h.lng;
      if (showNoCoords && hasCoords) return false;
      if (showWithCoords && !hasCoords) return false;
      return true;
    });

    if (groupByHouseNumber) {
      result.sort((a, b) => {
        const houseA = extractHouseNumber(a.address);
        const houseB = extractHouseNumber(b.address);
        if (houseA && houseB) {
          if (houseA === houseB) {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          }
          return houseA.localeCompare(houseB, undefined, { numeric: true });
        }
        return 0;
      });
    } else if (groupByNearby) {
      result.sort((a, b) => {
        const villageA = parseInt(extractVillageNumber(a.address) || "0");
        const villageB = parseInt(extractVillageNumber(b.address) || "0");
        if (villageA !== villageB) return villageA - villageB;
        const houseA = extractHouseNumber(a.address);
        const houseB = extractHouseNumber(b.address);
        return houseA.localeCompare(houseB, undefined, { numeric: true });
      });
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return result;
  }, [
    houses,
    search,
    provinceFilter,
    districtFilter,
    subdistrictFilter,
    villageFilter,
    houseNumberFilter,
    phoneFilter,
    showNoCoords,
    showWithCoords,
    groupByHouseNumber,
    groupByNearby,
  ]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedHouses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const verifyOnMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank",
    );
  };

  const openMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };

  const openEditModal = (house: House) => {
    setEditingHouse(house);
    setName(house.full_name);
    setPhone(house.phone);
    setAddress(house.address);
    setNote(house.note ?? "");
    setCoordInput(house.lat && house.lng ? `${house.lat},${house.lng}` : "");
    setDetectedLat(house.lat);
    setDetectedLng(house.lng);
    setShowEditModal(true);
  };

  const addToRoute = async (house: House) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      addToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }
    const { data: existing } = await supabase
      .from("today_houses")
      .select("id")
      .eq("user_id", user.id)
      .eq("full_name", house.full_name)
      .eq("phone", house.phone)
      .single();

    if (existing) {
      addToast("รายการนี้มีในรับงานแล้ว", "info");
      return;
    }

    const { error } = await supabase.from("today_houses").insert({
      user_id: user.id,
      full_name: house.full_name,
      phone: house.phone,
      address: house.address,
      lat: house.lat || null,
      lng: house.lng || null,
      note: house.note || null,
      order_index: 0,
    });

    if (error) addToast("เพิ่มเข้ารับงานไม่สำเร็จ: " + error.message, "error");
    else addToast("เพิ่มเข้ารับงานสำเร็จ!", "success");
  };

  const deleteHouse = async (id: string) => {
    if (!confirm("ลบบ้านนี้จริง ๆ นะ? (ทุกคนจะเห็นการเปลี่ยนแปลง)")) return;
    const { error } = await supabase.from("houses").delete().eq("id", id);
    if (error) addToast("ลบไม่สำเร็จ: " + error.message, "error");
    else {
      setHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("ลบบ้านเรียบร้อย", "success");
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation)
      return addToast("เบราว์เซอร์ไม่รองรับตำแหน่ง", "error");
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedLat(lat);
        setDetectedLng(lng);
        setCoordInput(`${lat},${lng}`);
        setIsDetecting(false);
        addToast("ตรวจจับพิกัดสำเร็จ!", "success");
      },
      () => {
        addToast("ไม่สามารถตรวจจับตำแหน่งได้", "error");
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const addHouse = async () => {
    setLoading(true);
    const { error } = await supabase.from("houses").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
      lat: detectedLat,
      lng: detectedLng,
    });
    if (error) addToast("เกิดข้อผิดพลาด: " + error.message, "error");
    else {
      addToast("เพิ่มบ้านสำเร็จ!", "success");
      setShowAdd(false);
      resetForm();
      reload();
    }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingHouse) return;
    setSaving(true);
    const { error } = await supabase
      .from("houses")
      .update({
        full_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim(),
        lat: detectedLat,
        lng: detectedLng,
      })
      .eq("id", editingHouse.id);

    if (error) addToast("อัปเดตไม่สำเร็จ: " + error.message, "error");
    else {
      addToast("อัปเดตข้อมูลสำเร็จ!", "success");
      setShowEditModal(false);
      resetForm();
      reload();
    }
    setSaving(false);
  };

  const clearFilters = () => {
    setSearch("");
    setProvinceFilter("");
    setDistrictFilter("");
    setSubdistrictFilter("");
    setVillageFilter("");
    setHouseNumberFilter("");
    setPhoneFilter("");
    setShowNoCoords(false);
    setShowWithCoords(false);
    setGroupByHouseNumber(false);
    setGroupByNearby(false);
    setCurrentPage(1);
    addToast("ล้างตัวกรองแล้ว", "info");
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setNote("");
    setCoordInput("");
    setDetectedLat(null);
    setDetectedLng(null);
    setEditingHouse(null);
    setSelectedSubdistrict(null);
    setShowMooDropdown(false);
    setShowSubdistrictDropdown(false);
    setShowVillageDropdown(false);
  };

  const closeAddEditModal = () => {
    setShowAdd(false);
    setShowEditModal(false);
    resetForm();
  };

  // ระบบกรอกที่อยู่แบบอัจฉริยะ
  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAddress(value);

    const trimmed = value.trimEnd();
    const endsWithSpace = value.endsWith(" ") || value.endsWith("\n");
    const cursorAtEnd = e.target.selectionStart === value.length;

    // 1. พิมพ์บ้านเลขที่เสร็จแล้วเว้นวรรค → แสดงหมู่ที่
    const houseNumberOnly = trimmed.match(/^[\d\/\\-]+$/);
    if (houseNumberOnly && endsWithSpace && cursorAtEnd) {
      setShowMooDropdown(true);
      setShowSubdistrictDropdown(false);
      setShowVillageDropdown(false);
      return;
    }

    // 2. มี ม.เลข แล้วเว้นวรรค → แสดงตำบล
    if (trimmed.match(/ม\.\s*\d+\s*$/) && endsWithSpace && cursorAtEnd) {
      setShowMooDropdown(false);
      setShowSubdistrictDropdown(true);
      setShowVillageDropdown(false);
      return;
    }

    // 3. เลือกตำบลแล้วเว้นวรรค → แสดงหมู่บ้าน
    if (
      selectedSubdistrict &&
      trimmed.endsWith(`ต.${selectedSubdistrict}`) &&
      endsWithSpace &&
      cursorAtEnd
    ) {
      setShowMooDropdown(false);
      setShowSubdistrictDropdown(false);
      setShowVillageDropdown(true);
      return;
    }

    // ถ้าไม่เข้าเงื่อนไขใด ๆ → ปิด dropdown ทั้งหมด
    setShowMooDropdown(false);
    setShowSubdistrictDropdown(false);
    setShowVillageDropdown(false);
  };

  const selectMoo = (moo: string) => {
    const base = address.replace(/ม\.\s*\d*\s*$/, "").trim();
    const newAddr = `${base} ม.${moo} `;
    setAddress(newAddr);
    setShowMooDropdown(false);
    setShowSubdistrictDropdown(true);
    setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const selectSubdistrict = (sub: string) => {
    let newAddr = address.replace(/ต\..*?($|\s)/, "").trim();
    newAddr = `${newAddr} ต.${sub} `;
    setAddress(newAddr);
    setSelectedSubdistrict(sub);
    setShowSubdistrictDropdown(false);
    setShowVillageDropdown(true);
    setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const selectVillageName = (village: string) => {
    let newAddr = address.replace(/บ\..*?($|\s)/, "").trim();
    newAddr = `${newAddr} บ.${village} อ.วังเจ้า จ.ตาก`;
    setAddress(newAddr);
    setShowVillageDropdown(false);
    setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    Papa.parse<CsvRow>(file, {
      header: true,
      encoding: "utf-8",
      complete: async (results) => {
        const rows = results.data;
        let addedCount = 0;
        for (const row of rows) {
          const full_name = (row.full_name || row.name || row.ชื่อ || "").trim();
          const phone = (row.phone || row.เบอร์ || "").trim();
          const address = (row.address || row.ที่อยู่ || "").trim();
          const note = (row.note || row.หมายเหตุ || "").trim();
          if (full_name && phone && address) {
            const { error } = await supabase.from("houses").insert({
              full_name,
              phone,
              address,
              note: note || null,
              lat: null,
              lng: null,
            });
            if (!error) addedCount++;
          }
        }
        if (addedCount > 0) {
          addToast(`เพิ่ม ${addedCount} บ้านใหม่!`, "success");
          reload();
        } else {
          addToast("ไม่มีบ้านใหม่ที่จะเพิ่ม", "info");
        }
        setUploading(false);
        setFile(null);
      },
    });
  };

  const downloadAllHousesCsv = async () => {
    setDownloading(true);
    const { data, error } = await supabase
      .from("houses")
      .select("id,full_name,phone,address,lat,lng,note,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      addToast("ดาวน์โหลดไม่สำเร็จ: " + error.message, "error");
      setDownloading(false);
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `คลังบ้าน_ทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("ดาวน์โหลด CSV สำเร็จ!", "success");
    setDownloading(false);
  };

  const downloadCsvExample = () => {
    const csvContent = `full_name,phone,address,note
สมชาย ใจดี,0812345678,"15/8 ม.5 ต.นาโบสถ์ บ.ลาดยาว อ.วังเจ้า จ.ตาก","ข้างศูนย์เด็กเล็ก"
สมศรี สุขใจ,0898765432,"123 ม.10 ต.เชียงทอง บ.วังเจ้า อ.วังเจ้า จ.ตาก","หลังอบต."`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "example_houses.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFilterCount = [
    provinceFilter,
    districtFilter,
    subdistrictFilter,
    villageFilter,
    houseNumberFilter,
    phoneFilter,
    showNoCoords ? "1" : "",
    showWithCoords ? "1" : "",
  ].filter(Boolean).length;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
        <PageHeader
          title="คลังบ้าน"
          description={
            fetching
              ? "กำลังโหลดข้อมูล..."
              : `บ้าน ${filteredAndSorted.length} หลังคาเรือน${
                  activeFilterCount > 0 ? " (กำลังกรอง)" : ""
                }`
          }
          icon={Package}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={downloadAllHousesCsv}
                loading={downloading}
              >
                <Download className="size-4" aria-hidden="true" />
                {downloading ? "กำลังโหลด..." : "โหลด CSV"}
              </Button>
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="size-4" aria-hidden="true" />
                เพิ่มบ้าน
              </Button>
            </>
          }
        >
          <Tabs
            label="โหมดการทำงาน"
            className="mt-2 sm:max-w-md"
            value={activeTab}
            onChange={(value) => setActiveTab(value as "list" | "csv")}
            items={[
              { value: "list", label: "รายชื่อบ้าน" },
              { value: "csv", label: "นำเข้า CSV" },
            ]}
          />
        </PageHeader>

        {activeTab === "list" && (
          <>
            {/* Search + Filter */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  label="ค้นหาบ้าน"
                  hideLabel
                  placeholder="ค้นหาทุกอย่าง (ชื่อ, เบอร์, ที่อยู่, พิกัด...)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
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

            {/* Group + coord options */}
            <Card className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5">
              <Checkbox
                label="จัดกลุ่มตามบ้านเลขที่"
                checked={groupByHouseNumber}
                onChange={(e) => {
                  setGroupByHouseNumber(e.target.checked);
                  setGroupByNearby(false);
                  setCurrentPage(1);
                }}
              />
              <Checkbox
                label="จัดกลุ่มตามพื้นที่ใกล้เคียง"
                checked={groupByNearby}
                onChange={(e) => {
                  setGroupByNearby(e.target.checked);
                  setGroupByHouseNumber(false);
                  setCurrentPage(1);
                }}
              />
              <Checkbox
                label="ยังไม่เพิ่มพิกัด"
                checked={showNoCoords}
                onChange={(e) => {
                  setShowNoCoords(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <Checkbox
                label="เพิ่มพิกัดแล้ว"
                checked={showWithCoords}
                onChange={(e) => {
                  setShowWithCoords(e.target.checked);
                  setCurrentPage(1);
                }}
              />
            </Card>

            {/* House list */}
            {fetching ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : loadFailed ? (
              <ErrorState
                title="โหลดคลังบ้านไม่สำเร็จ"
                description="ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองโหลดใหม่อีกครั้ง"
                onRetry={reload}
              />
            ) : filteredAndSorted.length === 0 ? (
              houses.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="ยังไม่มีบ้านในคลัง"
                  description="เริ่มจากการเพิ่มบ้านหลังแรก หรือนำเข้ารายชื่อทั้งชุดด้วยไฟล์ CSV"
                  action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={() => setShowAdd(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        เพิ่มบ้านหลังแรก
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setActiveTab("csv")}
                      >
                        <Upload className="size-4" aria-hidden="true" />
                        นำเข้า CSV
                      </Button>
                    </div>
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="ไม่พบบ้านที่ตรงกับเงื่อนไข"
                  description="ลองปรับคำค้นหา หรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
                  action={
                    <Button variant="secondary" onClick={clearFilters}>
                      ล้างตัวกรองทั้งหมด
                    </Button>
                  }
                />
              )
            ) : (
              <>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedHouses.map((h) => {
                    const hasCoords = Boolean(h.lat && h.lng);
                    return (
                      <li key={h.id} className="flex">
                        <Card className="flex w-full flex-col overflow-hidden transition-shadow hover:shadow-card-hover">
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 text-sm font-bold leading-tight text-slate-900">
                                {h.full_name || "ไม่มีชื่อ"}
                              </h3>
                              <div className="flex shrink-0 gap-1">
                                <Tooltip label="เพิ่มเข้ารับงานวันนี้">
                                  <Button
                                    variant="ghost-success"
                                    size="icon-sm"
                                    aria-label={`เพิ่ม ${h.full_name || "บ้านนี้"} เข้ารับงานวันนี้`}
                                    onClick={() => addToRoute(h)}
                                  >
                                    <Plus className="size-4" aria-hidden="true" />
                                  </Button>
                                </Tooltip>
                                <Tooltip label="แก้ไขข้อมูล">
                                  <Button
                                    variant="ghost-primary"
                                    size="icon-sm"
                                    aria-label={`แก้ไข ${h.full_name || "บ้านนี้"}`}
                                    onClick={() => openEditModal(h)}
                                  >
                                    <Edit3 className="size-4" aria-hidden="true" />
                                  </Button>
                                </Tooltip>
                                <Tooltip label="ลบ">
                                  <Button
                                    variant="ghost-danger"
                                    size="icon-sm"
                                    aria-label={`ลบ ${h.full_name || "บ้านนี้"}`}
                                    onClick={() => deleteHouse(h.id)}
                                  >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-700">
                                {h.phone}
                              </p>
                              <Tooltip label="คัดลอกเบอร์โทร">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="คัดลอกเบอร์โทร"
                                  onClick={() => copyPhone(h.phone)}
                                >
                                  <Copy className="size-3.5" aria-hidden="true" />
                                </Button>
                              </Tooltip>
                            </div>

                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {h.address}
                            </p>

                            {h.note && (
                              <p className="mt-1.5 text-xs italic text-warning-700">
                                หมายเหตุ: {h.note}
                              </p>
                            )}

                            <div className="mt-2.5">
                              {hasCoords ? (
                                <Badge tone="success">
                                  <MapPin
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                  มีพิกัดพร้อมนำทาง
                                </Badge>
                              ) : (
                                <Badge tone="warning">
                                  <MapPin
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                  ยังไม่มีพิกัด
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="px-4 pb-4">
                            {hasCoords ? (
                              <Button
                                variant="success"
                                className="w-full"
                                onClick={() => openMaps(h.lat!, h.lng!)}
                              >
                                <Navigation
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                นำทาง
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => openEditModal(h)}
                              >
                                <MapPin className="size-4" aria-hidden="true" />
                                เพิ่มพิกัด
                              </Button>
                            )}
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav
                    aria-label="แบ่งหน้า"
                    className="mt-8 flex items-center justify-center gap-2"
                  >
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      aria-label="หน้าก่อนหน้า"
                      disabled={currentPage === 1}
                      onClick={() => goToPage(currentPage - 1)}
                    >
                      <ChevronLeft className="size-5" aria-hidden="true" />
                    </Button>
                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.min(totalPages, 7) },
                        (_, i) => {
                          let page;
                          if (totalPages <= 7) page = i + 1;
                          else if (currentPage <= 4) page = i + 1;
                          else if (currentPage >= totalPages - 3)
                            page = totalPages - 6 + i;
                          else page = currentPage - 3 + i;
                          return page > 0 && page <= totalPages ? (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "primary" : "ghost"
                              }
                              size="sm"
                              aria-label={`ไปหน้า ${page}`}
                              aria-current={
                                currentPage === page ? "page" : undefined
                              }
                              onClick={() => goToPage(page)}
                            >
                              {page}
                            </Button>
                          ) : null;
                        },
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      aria-label="หน้าถัดไป"
                      disabled={currentPage === totalPages}
                      onClick={() => goToPage(currentPage + 1)}
                    >
                      <ChevronRight className="size-5" aria-hidden="true" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </>
        )}

        {/* CSV Tab */}
        {activeTab === "csv" && (
          <Card className="p-5 sm:p-6">
            <div className="space-y-5">
              <Alert variant="info" title="รูปแบบไฟล์ที่รองรับ">
                ไฟล์ .csv ที่มีคอลัมน์ full_name, phone, address และ note
                (รองรับหัวคอลัมน์ภาษาไทย เช่น ชื่อ, เบอร์, ที่อยู่, หมายเหตุ)
              </Alert>

              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-primary-300 sm:p-8">
                <Upload
                  className="mx-auto mb-3 size-10 text-slate-400"
                  aria-hidden="true"
                />
                <label className="mx-auto block w-full max-w-md cursor-pointer">
                  <span className="sr-only">เลือกไฟล์ CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-primary-700"
                  />
                </label>
                {file && (
                  <p className="mt-3 text-sm font-medium text-success-600">
                    เลือกไฟล์แล้ว: {file.name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="secondary"
                  className="sm:flex-1"
                  onClick={() => setShowCsvExample(true)}
                >
                  <FileText className="size-4" aria-hidden="true" />
                  ดูตัวอย่างไฟล์
                </Button>
                <Button
                  className="sm:flex-1"
                  onClick={handleFileUpload}
                  disabled={!file}
                  loading={uploading}
                >
                  {uploading ? "กำลังอัพโหลด..." : "อัพโหลด CSV"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Floating Add Button (mobile) — เหนือ bottom navigation */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        aria-label="เพิ่มบ้านใหม่"
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-elevated transition-colors hover:bg-primary-700 lg:hidden"
      >
        <Plus className="size-7" aria-hidden="true" />
      </button>

      {/* Filter Modal */}
      <Modal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="ตัวกรองบ้าน"
        description="กรองจากข้อมูลในที่อยู่โดยตรง"
        dismissOnOverlayClick
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                clearFilters();
                setShowFilterModal(false);
              }}
            >
              ล้างทั้งหมด
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setCurrentPage(1);
                setShowFilterModal(false);
              }}
            >
              ใช้ตัวกรอง
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="บ้านเลขที่"
            placeholder="เช่น 15/8"
            value={houseNumberFilter}
            onChange={(e) => setHouseNumberFilter(e.target.value)}
          />
          <Input
            label="เบอร์โทร"
            placeholder="เช่น 0812345678"
            inputMode="numeric"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value.replace(/\D/g, ""))}
          />
          <Input
            label="หมู่ที่"
            placeholder="ระบุแค่ตัวเลข เช่น 5"
            inputMode="numeric"
            value={villageFilter}
            onChange={(e) =>
              setVillageFilter(e.target.value.replace(/[^\d]/g, ""))
            }
          />
          <Input
            label="ตำบล"
            placeholder="เช่น นาโบสถ์"
            value={subdistrictFilter}
            onChange={(e) => setSubdistrictFilter(e.target.value)}
          />
          <Input
            label="อำเภอ"
            placeholder="เช่น วังเจ้า"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          />
          <Input
            label="จังหวัด"
            placeholder="เช่น ตาก"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
          />
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        open={showAdd || showEditModal}
        onClose={closeAddEditModal}
        title={showAdd ? "เพิ่มบ้านใหม่" : "แก้ไขข้อมูลบ้าน"}
        dismissOnOverlayClick
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeAddEditModal}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={showAdd ? addHouse : saveEdit}
              loading={loading || saving}
            >
              {loading || saving
                ? "กำลังบันทึก..."
                : showAdd
                  ? "เพิ่มบ้าน"
                  : "บันทึก"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="ชื่อ-นามสกุล"
            placeholder="เช่น สมชาย ใจดี"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="เบอร์โทรศัพท์"
            placeholder="เช่น 0812345678"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* ที่อยู่ + Dropdown ทั้ง 3 ชั้น */}
          <div className="relative">
            <Textarea
              ref={addressInputRef}
              label="ที่อยู่"
              hint="พิมพ์บ้านเลขที่แล้วเว้นวรรค ระบบจะช่วยเลือกหมู่/ตำบล/หมู่บ้าน"
              placeholder="บ้านเลขที่ เช่น 15/8 แล้วเว้นวรรค"
              value={address}
              onChange={handleAddressChange}
              rows={4}
            />

            {/* หมู่ที่ */}
            {showMooDropdown && (
              <div
                role="listbox"
                aria-label="เลือกหมู่ที่"
                className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-elevated"
              >
                {villages.map((m) => (
                  <div
                    key={m}
                    role="option"
                    aria-selected={false}
                    className="cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectMoo(m)}
                  >
                    หมู่ {m}
                  </div>
                ))}
              </div>
            )}

            {/* ตำบล */}
            {showSubdistrictDropdown && (
              <div
                role="listbox"
                aria-label="เลือกตำบล"
                className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-elevated"
              >
                {subdistricts.map((s) => (
                  <div
                    key={s}
                    role="option"
                    aria-selected={false}
                    className="cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSubdistrict(s)}
                  >
                    ต.{s}
                  </div>
                ))}
              </div>
            )}

            {/* หมู่บ้าน */}
            {showVillageDropdown && selectedSubdistrict && (
              <div
                role="listbox"
                aria-label="เลือกหมู่บ้าน"
                className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-elevated"
              >
                {villageBySubdistrict[selectedSubdistrict].map((v) => (
                  <div
                    key={v}
                    role="option"
                    aria-selected={false}
                    className="cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectVillageName(v)}
                  >
                    {v}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Textarea
            label="หมายเหตุ"
            placeholder="เช่น ข้างศูนย์เด็กเล็ก, หลังอบต."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />

          <Button
            variant="secondary"
            className="w-full"
            onClick={detectLocation}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <MapPin className="size-5" aria-hidden="true" />
            )}
            {isDetecting ? "กำลังตรวจจับ..." : "ตรวจจับตำแหน่งปัจจุบัน"}
          </Button>

          <Input
            label="พิกัด (ละติจูด,ลองจิจูด)"
            placeholder="เช่น 16.123456,99.123456"
            value={coordInput}
            onChange={(e) => {
              setCoordInput(e.target.value);
              const [latStr, lngStr] = e.target.value.split(",");
              const lat = parseFloat(latStr);
              const lng = parseFloat(lngStr);
              if (!isNaN(lat) && !isNaN(lng)) {
                setDetectedLat(lat);
                setDetectedLng(lng);
              } else {
                setDetectedLat(null);
                setDetectedLng(null);
              }
            }}
          />

          {detectedLat && detectedLng && (
            <button
              type="button"
              onClick={() => verifyOnMaps(detectedLat, detectedLng)}
              className="mx-auto flex items-center gap-1 text-xs text-primary-600 underline hover:text-primary-700"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              ตรวจสอบพิกัดบน Google Maps
            </button>
          )}
        </div>
      </Modal>

      {/* CSV Example Modal */}
      <Modal
        open={showCsvExample}
        onClose={() => setShowCsvExample(false)}
        title="ตัวอย่างไฟล์ CSV"
        dismissOnOverlayClick
        footer={
          <Button className="w-full" onClick={downloadCsvExample}>
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            ดาวน์โหลดไฟล์ตัวอย่าง
          </Button>
        }
      >
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700">
          {`full_name,phone,address,note
สมชาย ใจดี,0812345678,"15/8 ม.5 ต.นาโบสถ์ บ.ลาดยาว อ.วังเจ้า จ.ตาก","ข้างศูนย์เด็กเล็ก"
สมศรี สุขใจ,0898765432,"123 ม.10 ต.เชียงทอง บ.วังเจ้า อ.วังเจ้า จ.ตาก","หลังอบต."`}
        </pre>
      </Modal>
    </>
  );
}
