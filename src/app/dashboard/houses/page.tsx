// src/app/dashboard/houses/page.tsx
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Navigation,
  MapPin,
  Loader2,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const ITEMS_PER_PAGE = 20;

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState(""); // หมู่ที่
  const [currentPage, setCurrentPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coordInput, setCoordInput] = useState("");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Ref สำหรับคลิกนอก modal
  const filterModalRef = useRef<HTMLDivElement>(null);
  const addEditModalRef = useRef<HTMLDivElement>(null);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  // โหลดข้อมูลบ้าน
  useEffect(() => {
    const loadHouses = async () => {
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    };
    loadHouses();
  }, []);

  // คลิกนอก Modal แล้วปิด
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showFilterModal &&
        filterModalRef.current &&
        !filterModalRef.current.contains(e.target as Node)
      ) {
        setShowFilterModal(false);
      }
      if (
        (showAdd || showEditModal) &&
        addEditModalRef.current &&
        !addEditModalRef.current.contains(e.target as Node)
      ) {
        setShowAdd(false);
        setShowEditModal(false);
        resetForm();
      }
    };

    if (showFilterModal || showAdd || showEditModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterModal, showAdd, showEditModal]);

  // ตัวกรองสุดฉลาด
  const filtered = useMemo(() => {
    return houses.filter((h) => {
      const addr = h.address;
      const addrLower = addr.toLowerCase();

      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesSearch =
          h.full_name.toLowerCase().includes(term) ||
          h.phone.includes(term) ||
          addrLower.includes(term);
        if (!matchesSearch) return false;
      }

      const extractMooNumber = (): number | null => {
        const patterns = [
          /หมู่\s*[ที่]?\s*(\d+)/i,
          /ม\.\s*(\d+)/i,
          /หมู่ที่\s*(\d+)/i,
          /หมู่\s*(\d+)/i,
          /ม\s*(\d+)/i,
        ];
        for (const pattern of patterns) {
          const match = addr.match(pattern);
          if (match) return parseInt(match[1], 10);
        }
        return null;
      };

      if (provinceFilter.trim()) {
        const p = provinceFilter.toLowerCase().trim();
        if (
          !addrLower.includes(`จ.${p}`) &&
          !addrLower.includes(`จังหวัด${p}`) &&
          !addrLower.includes(p)
        ) {
          return false;
        }
      }

      if (districtFilter.trim()) {
        const d = districtFilter.toLowerCase().trim();
        if (
          !addrLower.includes(`อ.${d}`) &&
          !addrLower.includes(`อำเภอ${d}`) &&
          !addrLower.includes(d)
        ) {
          return false;
        }
      }

      if (subdistrictFilter.trim()) {
        const t = subdistrictFilter.toLowerCase().trim();
        if (
          !addrLower.includes(`ต.${t}`) &&
          !addrLower.includes(`ตำบล${t}`) &&
          !addrLower.includes(t)
        ) {
          return false;
        }
      }

      if (villageFilter.trim()) {
        const inputNum = parseInt(villageFilter.trim(), 10);
        if (isNaN(inputNum)) return false;
        const mooNum = extractMooNumber();
        if (mooNum === null || mooNum !== inputNum) return false;
      }

      return true;
    });
  }, [
    houses,
    search,
    provinceFilter,
    districtFilter,
    subdistrictFilter,
    villageFilter,
  ]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedHouses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

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
    setCoordInput(house.lat && house.lng ? `${house.lat},${house.lng}` : "");
    setDetectedLat(house.lat);
    setDetectedLng(house.lng);
    setShowEditModal(true);
  };

  // ฟังก์ชันใหม่: เพิ่มบ้านเข้า today_houses (เหมือน addFromSearch ใน upload page)
  const addToRoute = async (house: House) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      addToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }

    const { error } = await supabase.from("today_houses").insert({
      user_id: user.id,
      full_name: house.full_name,
      phone: house.phone,
      address: house.address,
      lat: house.lat || null,
      lng: house.lng || null,
      order_index: 0,
      delivered: false,
    });

    if (error) {
      addToast("เพิ่มเข้ารับงานไม่สำเร็จ: " + error.message, "error");
    } else {
      addToast("เพิ่มเข้ารับงานสำเร็จ!", "success");
    }
  };

  // Helper functions จาก upload page (สำหรับเพิ่มลงคลังถ้ายังไม่มี)
  const normalizeAddress = (addr: string): string => {
    if (!addr) return "";
    let normalized = addr.toLowerCase().trim();
    normalized = normalized
      .replace(/บ้านเลขที่/g, "")
      .replace(/เลขที่/g, "")
      .replace(/หมู่บ้าน/g, "")
      .replace(/คอนโด/g, "")
      .replace(/อาคาร/g, "")
      .replace(/ชั้น/g, "")
      .replace(/ห้อง/g, "")
      .replace(/ซอย/g, "ซ.")
      .replace(/ถนน/g, "ถ.")
      .replace(/ตำบล/g, "ต.")
      .replace(/อำเภอ/g, "อ.")
      .replace(/จังหวัด/g, "จ.")
      .replace(/แขวง/g, "ต.")
      .replace(/เขต/g, "อ.")
      .replace(/กรุงเทพฯ|กทม|กรุงเทพมหานคร/g, "กรุงเทพ")
      .replace(/ม\./g, "ม")
      .replace(/หมู่ที่/g, "หมู่")
      .replace(/หมู่/g, "ม")
      .replace(/ต\./g, "ต.")
      .replace(/อ\./g, "อ.")
      .replace(/จ\./g, "จ.");
    normalized = normalized.replace(/ม\s*(\d+)/g, "ม$1");
    normalized = normalized.replace(/\s+/g, " ").trim();
    return normalized;
  };

  const isAddressInWarehouse = (newAddress: string): boolean => {
    const normalizedNew = normalizeAddress(newAddress);
    return houses.some((h) => normalizeAddress(h.address) === normalizedNew);
  };

  const addToWarehouseIfNew = async (
    name: string,
    phone: string,
    addr: string,
  ) => {
    if (isAddressInWarehouse(addr)) {
      return; // มีแล้ว ไม่เพิ่ม
    }
    const { error } = await supabase.from("houses").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      address: addr.trim(),
      lat: null,
      lng: null,
    });
    if (error) {
      console.error("เพิ่มลงคลังล้มเหลว:", error);
    } else {
      // รีโหลดคลัง
      const { data } = await supabase.from("houses").select("*");
      if (data) setHouses(data as House[]);
    }
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
    if (!name.trim() || !phone.trim() || !address.trim())
      return addToast("กรุณากรอกข้อมูลให้ครบ", "error");
    if (!detectedLat || !detectedLng)
      return addToast("กรุณาระบุพิกัดที่ถูกต้อง", "error");

    setLoading(true);
    const { error } = await supabase.from("houses").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      lat: detectedLat,
      lng: detectedLng,
    });

    if (error) addToast("เกิดข้อผิดพลาด: " + error.message, "error");
    else {
      addToast("เพิ่มบ้านสำเร็จ!", "success");
      setShowAdd(false);
      resetForm();
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim())
      return addToast("กรุณากรอกข้อมูลให้ครบ", "error");
    if (!detectedLat || !detectedLng)
      return addToast("กรุณาระบุพิกัดที่ถูกต้อง", "error");
    if (!editingHouse) return;

    setSaving(true);
    const { error } = await supabase
      .from("houses")
      .update({
        full_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        lat: detectedLat,
        lng: detectedLng,
      })
      .eq("id", editingHouse.id);

    if (error) addToast("อัปเดตไม่สำเร็จ: " + error.message, "error");
    else {
      addToast("อัปเดตข้อมูลสำเร็จ!", "success");
      setShowEditModal(false);
      resetForm();
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    }
    setSaving(false);
  };

  const clearFilters = () => {
    setProvinceFilter("");
    setDistrictFilter("");
    setSubdistrictFilter("");
    setVillageFilter("");
    setSearch("");
    setCurrentPage(1);
    addToast("ล้างตัวกรองแล้ว", "info");
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setCoordInput("");
    setDetectedLat(null);
    setDetectedLng(null);
    setEditingHouse(null);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              คลังบ้าน
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              จังหวัดตาก • {filtered.length} รายการ (แชร์ร่วมกัน)
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-md"
            >
              <Plus className="w-4 h-4" /> เพิ่มบ้าน
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="ค้นหา ชื่อ, เบอร์, ที่อยู่..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition"
          >
            <Filter className="w-4 h-4" /> ตัวกรอง
          </button>
        </div>

        {/* รายการบ้าน */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 bg-gray-200 border-2 border-dashed rounded-2xl" />
            <p className="text-xl font-semibold text-gray-700">
              ยังไม่มีบ้านในคลัง
            </p>
            <p className="text-gray-500 text-sm mt-2">
              กดปุ่ม + เพื่อเพิ่มบ้านแรก
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedHouses.map((h) => (
                <div
                  key={h.id}
                  className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {/* ปุ่มใหม่: + สำหรับเพิ่มเข้ารับงาน */}
                    <button
                      onClick={() => addToRoute(h)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow hover:bg-green-50"
                      title="เพิ่มเข้ารับงาน"
                    >
                      <Plus className="w-3.5 h-3.5 text-green-600" />
                    </button>
                    {/* ปุ่มแก้ไขเดิม */}
                    <button
                      onClick={() => openEditModal(h)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow hover:bg-blue-50"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    {/* ปุ่มลบเดิม */}
                    <button
                      onClick={() => deleteHouse(h.id)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-indigo-700 text-sm line-clamp-2 leading-tight">
                      {h.full_name || "ไม่มีชื่อ"}
                    </h3>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {h.phone}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-tight">
                      {h.address}
                    </p>
                  </div>
                  <div className="px-4 pb-4">
                    {h.lat && h.lng ? (
                      <button
                        onClick={() => openMaps(h.lat!, h.lng!)}
                        className="w-full py-2.5 text-sm font-semibold text-white bg-linear-to-r from-emerald-600 to-green-600 rounded-lg hover:from-emerald-700 hover:to-green-700 transition flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-4 h-4" /> นำทาง
                      </button>
                    ) : (
                      <button
                        onClick={() => openEditModal(h)}
                        className="w-full py-2.5 text-sm font-semibold text-white bg-linear-to-r from-orange-500 to-red-500 rounded-lg hover:from-orange-600 hover:to-red-600 transition flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="w-4 h-4" /> เพิ่มพิกัด
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let page;
                    if (totalPages <= 7) page = i + 1;
                    else if (currentPage <= 4) page = i + 1;
                    else if (currentPage >= totalPages - 3)
                      page = totalPages - 6 + i;
                    else page = currentPage - 3 + i;

                    return page > 0 && page <= totalPages ? (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {page}
                      </button>
                    ) : null;
                  })}
                  {totalPages > 7 && currentPage < totalPages - 3 && (
                    <span className="px-2">...</span>
                  )}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating + Button (มือถือ) */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition lg:hidden"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Toast */}
      <div className="fixed top-16 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium animate-in slide-in-from-top ${
              t.type === "success"
                ? "bg-green-600"
                : t.type === "error"
                  ? "bg-red-600"
                  : "bg-blue-600"
            }`}
          >
            {t.type === "success" && <CheckCircle className="w-5 h-5" />}
            {t.type === "error" && <XCircle className="w-5 h-5" />}
            {t.type === "info" && <AlertCircle className="w-5 h-5" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            ref={filterModalRef}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-bold mb-5 text-center">
              ตัวกรองที่อยู่ (ฉลาดมาก!)
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="หมู่ที่ (กรอกแค่เลข เช่น 1, 5, 12)"
                value={villageFilter}
                onChange={(e) =>
                  setVillageFilter(e.target.value.replace(/[^\d]/g, ""))
                }
                className="w-full px-4 py-2.5 text-sm border-2 border-orange-300 rounded-xl focus:border-orange-500 focus:outline-none font-bold text-orange-700"
              />
              <p className="text-xs text-orange-600 mt-1 text-center">
                กรอกแค่เลข เช่น <strong>1</strong> = เจอทุกหมู่ 1
              </p>
            </div>
            <div className="space-y-4 mt-4">
              <input
                type="text"
                placeholder="ตำบล (เช่น นาโบสถ์, แม่กาษา)"
                value={subdistrictFilter}
                onChange={(e) => setSubdistrictFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="อำเภอ (เช่น วังเจ้า, เมืองตาก)"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="จังหวัด (เช่น ตาก, กรุงเทพ)"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
                className="flex-1 py-2.5 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setShowFilterModal(false);
                }}
                className="flex-1 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition"
              >
                ใช้ตัวกรอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(showAdd || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            ref={addEditModalRef}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <h2 className="text-xl font-bold mb-5">
              {showAdd ? "เพิ่มบ้านใหม่" : "แก้ไขบ้าน"}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="เบอร์โทรศัพท์"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <textarea
                placeholder="ที่อยู่เต็ม"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={detectLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isDetecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
                {isDetecting ? "กำลังตรวจจับ..." : "ตรวจจับตำแหน่งปัจจุบัน"}
              </button>
              <input
                type="text"
                placeholder="พิกัด (lat,lng)"
                value={coordInput}
                onChange={(e) => {
                  setCoordInput(e.target.value);
                  const [lat, lng] = e.target.value.split(",").map(parseFloat);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setDetectedLat(lat);
                    setDetectedLng(lng);
                  } else {
                    setDetectedLat(null);
                    setDetectedLng(null);
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              {detectedLat && detectedLng && (
                <div className="text-center -mt-2">
                  <button
                    onClick={() => verifyOnMaps(detectedLat, detectedLng)}
                    className="text-blue-600 text-xs underline flex items-center gap-1 mx-auto"
                  >
                    <ExternalLink className="w-3 h-3" /> ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={showAdd ? addHouse : saveEdit}
                  disabled={loading || saving || !detectedLat}
                  className="flex-1 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition"
                >
                  {loading || saving
                    ? "กำลังบันทึก..."
                    : showAdd
                      ? "เพิ่มบ้าน"
                      : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
