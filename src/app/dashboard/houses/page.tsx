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
  AlertCircle,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  Image as ImageIcon,
  Camera,
  Edit,
  Copy, // ใหม่: สำหรับคัดลอกเบอร์
} from "lucide-react";
import Papa from "papaparse";
import Tesseract from "tesseract.js";

interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

interface ParsedHouse {
  id: string;
  name: string;
  phone: string;
  address: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const ITEMS_PER_PAGE = 20;

export default function HousesPage() {
  const [activeTab, setActiveTab] = useState<"list" | "csv" | "image">("list");
  const [houses, setHouses] = useState<House[]>([]);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCsvExample, setShowCsvExample] = useState(false);
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
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [parsedHouses, setParsedHouses] = useState<ParsedHouse[]>([]);

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

  // ใหม่: คัดลอกเบอร์โทร
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์โทรแล้ว", "success");
    } catch (err) {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
  };

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

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

  // ปรับใหม่: addToRoute - เพิ่มโดยตรง ไม่มี modal กรอก quantity
  const addToRoute = async (house: House) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      addToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }
    // Check if exists in today's
    const { data: existing, error: checkError } = await supabase
      .from("today_houses")
      .select("id")
      .eq("user_id", user.id)
      .eq("full_name", house.full_name)
      .eq("phone", house.phone)
      .single();
    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows
      addToast("ตรวจสอบข้อมูลล้มเหลว: " + checkError.message, "error");
      return;
    }
    let insertError;
    if (existing) {
      // มีแล้ว ไม่เพิ่มซ้ำ
      insertError = { message: "รายการนี้มีในรับงานแล้ว" };
    } else {
      // Insert new
      const { error } = await supabase.from("today_houses").insert({
        user_id: user.id,
        full_name: house.full_name,
        phone: house.phone,
        address: house.address,
        lat: house.lat || null,
        lng: house.lng || null,
        order_index: 0,
      });
      insertError = error;
    }
    if (insertError && insertError.message !== "รายการนี้มีในรับงานแล้ว") {
      addToast("เพิ่มเข้ารับงานไม่สำเร็จ: " + insertError.message, "error");
    } else {
      addToast(
        existing ? "รายการนี้มีในรับงานแล้ว" : "เพิ่มเข้ารับงานสำเร็จ!",
        existing ? "info" : "success",
      );
    }
  };

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
      return;
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
      const { data } = await supabase.from("houses").select("*");
      if (data) setHouses(data as House[]);
    }
  };

  const parseTextFromImage = (text: string): ParsedHouse[] => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const houses: ParsedHouse[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const nameMatch = line.match(/^(.+?)\s+\*{4}(\d{4})$/);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const phone = `****${nameMatch[2]}`;
        i++;
        let addr = "";
        let addrLines = 0;
        while (i < lines.length && addrLines < 3) {
          const nextLine = lines[i];
          if (
            nextLine.match(/^\d{4}-\d{2}-\d{2}/) ||
            nextLine.match(/PCS|COD|บ|฿|\d+\.\d+/) ||
            nextLine.length < 5 ||
            nextLine.match(/^(.+?)\s+\*{4}(\d{4})$/) ||
            (nextLine.includes("วังเจ้า") &&
              nextLine.includes("ตาก") &&
              addr.includes("ตาก"))
          ) {
            break;
          }
          if (addr) addr += " ";
          addr += nextLine;
          i++;
          addrLines++;
        }
        if (name.length > 2 && phone && addr.length > 5) {
          houses.push({
            id: `${Date.now()}-${houses.length}`,
            name,
            phone,
            address: addr.trim(),
          });
        }
      } else {
        i++;
      }
    }
    return houses;
  };

  const processImage = async () => {
    if (!imageFile) return;
    setProcessing(true);
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(imageFile, "tha+eng", {
        logger: (m: any) => console.log(m),
      });
      const parsed = parseTextFromImage(text);
      if (parsed.length === 0) {
        addToast(
          "ไม่พบข้อมูลบ้านในรูป (ลองอัพรูปชัดๆ หรือ crop เฉพาะส่วนข้อมูลอีกครั้ง)",
          "error",
        );
      } else {
        setParsedHouses(parsed);
        addToast(
          `ดึงข้อมูลสำเร็จ! พบ ${parsed.length} บ้าน (แก้ไขได้ก่อนบันทึก)`,
          "success",
        );
      }
    } catch (error) {
      console.error("OCR Error:", error);
      addToast("ประมวลผลรูปผิดพลาด ลองอัพรูปชัดๆ อีกครั้ง", "error");
    }
    setProcessing(false);
  };

  const updateParsedHouse = (
    id: string,
    field: keyof ParsedHouse,
    value: string,
  ) => {
    setParsedHouses((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    );
  };

  const removeParsedHouse = (id: string) => {
    setParsedHouses((prev) => prev.filter((h) => h.id !== id));
    addToast("ลบรายการนี้แล้ว", "info");
  };

  const saveParsedHouses = async () => {
    if (parsedHouses.length === 0) return;
    setSaving(true);
    let addedCount = 0;
    for (const ph of parsedHouses) {
      if (ph.name.trim() && ph.phone.trim() && ph.address.trim()) {
        await addToWarehouseIfNew(ph.name, ph.phone, ph.address);
        addedCount++;
      } else {
        addToast(
          `ข้าม "${ph.name}": ข้อมูลไม่ครบ (ชื่อ/เบอร์/ที่อยู่)`,
          "info",
        );
      }
    }
    if (addedCount > 0) {
      addToast(`เพิ่ม ${addedCount} บ้านใหม่ลงคลังจริง!`, "success");
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    } else {
      addToast("ไม่มีข้อมูลใหม่ที่จะเพิ่ม (ซ้ำหรือไม่ครบทั้งหมด)", "info");
    }
    setParsedHouses([]);
    setImageFile(null);
    setImagePreview(null);
    setSaving(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setParsedHouses([]);
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

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true,
      encoding: "utf-8",
      complete: async (results) => {
        const rows = results.data as any[];
        let addedCount = 0;
        for (const row of rows) {
          const full_name = (
            row.full_name ||
            row.name ||
            row.ชื่อ ||
            ""
          ).trim();
          const phone = (row.phone || row.เบอร์ || "").trim();
          const address = (row.address || row.ที่อยู่ || "").trim();
          if (full_name && phone && address) {
            if (!isAddressInWarehouse(address)) {
              const { error } = await supabase.from("houses").insert({
                full_name,
                phone,
                address,
                lat: null,
                lng: null,
              });
              if (!error) addedCount++;
            }
          }
        }
        if (addedCount > 0) {
          addToast(`เพิ่ม ${addedCount} บ้านใหม่!`, "success");
          const { data } = await supabase
            .from("houses")
            .select("*")
            .order("created_at", { ascending: false });
          setHouses((data as House[]) ?? []);
        } else {
          addToast(
            "ไม่มีบ้านใหม่ที่จะเพิ่ม (ซ้ำทั้งหมดหรือข้อมูลไม่ครบ)",
            "info",
          );
        }
        setUploading(false);
        setFile(null);
      },
    });
  };

  const downloadCsvExample = () => {
    const csvContent = `full_name,phone,address
สมชาย ใจดี,0812345678,"123 หมู่ 1 ต.นาโบสถ์ อ.วังเจ้า จ.ตาก"
สมศรี สุขใจ,0898765432,"456 หมู่ 5 ต.แม่กาษา อ.เมืองตาก จ.ตาก"`;
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

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              คลังบ้าน
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              บ้าน {filtered.length} หลังคาเรือน
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
        <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2.5 font-medium text-xs transition ${
              activeTab === "list"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Search className="w-4 h-4 mx-auto mb-0.5" />
            รายการ
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`flex-1 py-2.5 font-medium text-xs transition ${
              activeTab === "csv"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 mx-auto mb-0.5" />
            CSV
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`flex-1 py-2.5 font-medium text-xs transition ${
              activeTab === "image"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ImageIcon className="w-4 h-4 mx-auto mb-0.5" />
            รูปภาพ
          </button>
        </div>
        {activeTab === "list" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 text-gray-800">
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
                        <button
                          onClick={() => addToRoute(h)}
                          className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow hover:bg-green-50"
                          title="เพิ่มเข้ารับงาน"
                        >
                          <Plus className="w-3.5 h-3.5 text-green-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow hover:bg-blue-50"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm font-medium text-gray-700">
                            {h.phone}
                          </p>
                          <button
                            onClick={() => copyPhone(h.phone)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="คัดลอกเบอร์โทร"
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
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
                        },
                      )}
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
          </>
        )}
        {activeTab === "csv" && (
          <div className="bg-white rounded-2xl shadow-lg p-5 text-gray-800">
            <div className="space-y-5">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {file && (
                  <p className="mt-3 text-sm font-medium text-green-600">
                    {file.name}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCsvExample(true)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> ตัวอย่าง
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!file || uploading}
                  className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? "กำลังอัพโหลด..." : "อัพโหลด CSV"}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "image" && (
          <div className="bg-white rounded-2xl shadow-lg p-5 text-gray-800 space-y-5">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
              <Camera className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-48 object-cover rounded-xl mx-auto"
                  />
                  <p className="mt-2 text-sm text-green-600">
                    รูปที่เลือก: {imageFile?.name}
                  </p>
                </div>
              )}
            </div>
            {imageFile && !processing && parsedHouses.length === 0 && (
              <button
                onClick={processImage}
                className="w-full py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center gap-2 mx-auto"
              >
                <ImageIcon className="w-4 h-4" /> ประมวลผลรูป (ดึงข้อมูลด้วย
                OCR)
              </button>
            )}
            {processing && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-sm text-gray-600">
                  กำลังอ่านข้อความจากรูป... (อาจใช้เวลา 10-30 วินาที)
                </p>
              </div>
            )}
            {parsedHouses.length > 0 && (
              <>
                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg">
                    ข้อมูลที่ดึงจากรูป ({parsedHouses.length} รายการ)
                  </h3>
                  <p className="text-sm text-gray-500">
                    แก้ไขชื่อ/เบอร์/ที่อยู่ได้ ก่อนกดบันทึก
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                  {parsedHouses.map((ph, index) => (
                    <div
                      key={ph.id}
                      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-sm text-gray-800">
                          บ้านที่ {index + 1}
                        </h4>
                        <button
                          onClick={() => removeParsedHouse(ph.id)}
                          className="p-1 text-red-500 hover:text-red-700 transition"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="ชื่อ-นามสกุล (เช่น ศริพร ปานสีทอง)"
                        value={ph.name}
                        onChange={(e) =>
                          updateParsedHouse(ph.id, "name", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-2"
                      />
                      <input
                        type="text"
                        placeholder="เบอร์โทร (เช่น ****6180)"
                        value={ph.phone}
                        onChange={(e) =>
                          updateParsedHouse(ph.id, "phone", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-2"
                      />
                      <textarea
                        placeholder="ที่อยู่เต็ม (เช่น 221หมู่1 บ้านลาดยาว ...)"
                        value={ph.address}
                        onChange={(e) =>
                          updateParsedHouse(ph.id, "address", e.target.value)
                        }
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={saveParsedHouses}
                  disabled={saving || parsedHouses.length === 0}
                  className="w-full py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  เพิ่มลงคลังจริง {parsedHouses.length} รายการ
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition lg:hidden"
      >
        <Plus className="w-8 h-8" />
      </button>
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
            {t.type === "success" && <Plus className="w-5 h-5" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5" />}
            {t.type === "info" && <AlertCircle className="w-5 h-5" />}
            {t.message}
          </div>
        ))}
      </div>
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
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
      {(showAdd || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
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
                  disabled={loading || saving}
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
      {showCsvExample && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 text-gray-800"
          onClick={() => setShowCsvExample(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                ตัวอย่าง CSV สำหรับเพิ่มบ้าน
              </h3>
              <button
                onClick={() => setShowCsvExample(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {`full_name,phone,address
สมชาย ใจดี,0812345678,"123 หมู่ 1 ต.นาโบสถ์ อ.วังเจ้า จ.ตาก"
สมศรี สุขใจ,0898765432,"456 หมู่ 5 ต.แม่กาษา อ.เมืองตาก จ.ตาก"`}
            </pre>
            <p className="text-xs text-gray-500 mt-3">
              ใช้ " " ล้อมที่อยู่ที่มี comma
            </p>
            <button
              onClick={downloadCsvExample}
              className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              โหลดไฟล์ CSV ตัวอย่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
