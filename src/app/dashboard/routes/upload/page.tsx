// src/app/dashboard/routes/upload/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  UserPlus,
  FileSpreadsheet,
  X,
  Camera, // เพิ่ม icon สำหรับสแกน QR
} from "lucide-react";
import Papa from "papaparse";
interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
}
interface ParcelData {
  // Interface สำหรับข้อมูลพัสดุ (สมมติ)
  parcel_id: string;
  full_name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
}
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<
    "manual" | "search" | "file" | "scan"
  >("search"); // เพิ่ม "scan" ใน tab
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false); // State สำหรับสแกน
  const [searchTerm, setSearchTerm] = useState("");
  const [parcelId, setParcelId] = useState(""); // Input สำหรับหมายเลขพัสดุ
  const [scannedData, setScannedData] = useState<ParcelData | null>(null); // ข้อมูลที่สแกนได้
  const [allHouses, setAllHouses] = useState<House[]>([]);
  const [showCsvExample, setShowCsvExample] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };
  useEffect(() => {
    const loadHouses = async () => {
      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) addToast("โหลดคลังบ้านไม่สำเร็จ", "error");
      else setAllHouses(data || []);
    };
    loadHouses();
  }, []);
  const filteredHouses = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allHouses.filter(
      (h) =>
        h.full_name.toLowerCase().includes(term) ||
        h.phone.includes(term) ||
        h.address.toLowerCase().includes(term),
    );
  }, [allHouses, searchTerm]);
  // ฟังก์ชันทำให้ที่อยู่เป็นมาตรฐาน (สำหรับเปรียบเทียบ)
  const normalizeAddress = (addr: string): string => {
    if (!addr) return "";
    let normalized = addr.toLowerCase().trim();
    // ลบคำที่ไม่จำเป็น
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
    // ทำให้ตัวเลขหมู่ติดกัน
    normalized = normalized.replace(/ม\s*(\d+)/g, "ม$1");
    // ลบช่องว่างเกิน
    normalized = normalized.replace(/\s+/g, " ").trim();
    return normalized;
  };
  // เช็คว่ามีที่อยู่นี้ในคลังหรือยัง
  const isAddressInWarehouse = (newAddress: string): boolean => {
    const normalizedNew = normalizeAddress(newAddress);
    return allHouses.some((h) => normalizeAddress(h.address) === normalizedNew);
  };
  // เพิ่มลงคลังบ้าน (ถ้ายังไม่มี)
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
      if (data) setAllHouses(data);
    }
  };
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      addToast("กรอกข้อมูลให้ครบ", "error");
      return;
    }
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      addToast("กรุณาเข้าสู่ระบบ", "error");
      setSubmitting(false);
      return;
    }
    // 1. เพิ่มลง today_houses
    const { error: todayError } = await supabase.from("today_houses").insert({
      user_id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      lat: null,
      lng: null,
      order_index: 0,
      delivered: false,
    });
    if (todayError) {
      addToast("เพิ่มรายการวันนี้ล้มเหลว", "error");
    } else {
      addToast("เพิ่มรายการวันนี้สำเร็จ!", "success");
      // 2. เพิ่มลงคลังบ้าน ถ้ายังไม่มี
      await addToWarehouseIfNew(fullName.trim(), phone.trim(), address.trim());
      // รีเซ็ตฟอร์ม
      setFullName("");
      setPhone("");
      setAddress("");
    }
    setSubmitting(false);
  };
  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      addToast("กรุณาเข้าสู่ระบบ", "error");
      setUploading(false);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("today_houses").delete().gte("created_at", today);
    Papa.parse(file, {
      header: true,
      encoding: "utf-8",
      complete: async (results) => {
        const rows = results.data as any[];
        const validRows = rows
          .map((row: any) => ({
            user_id: user.id,
            full_name: (row.full_name || row.name || row.ชื่อ || "").trim(),
            phone: (row.phone || row.เบอร์ || "").trim(),
            address: (row.address || row.ที่อยู่ || "").trim(),
            lat: null,
            lng: null,
            order_index: 0,
            delivered: false,
          }))
          .filter((h: any) => h.full_name && h.phone && h.address);
        if (validRows.length === 0) {
          addToast("ไม่พบข้อมูลในไฟล์", "error");
          setUploading(false);
          return;
        }
        const { error } = await supabase.from("today_houses").insert(validRows);
        if (error) {
          addToast("อัพโหลดล้มเหลว", "error");
        } else {
          addToast(`เพิ่ม ${validRows.length} รายการ!`, "success");
          // เพิ่มลงคลังบ้านทีละรายการ (ถ้ายังไม่มี)
          for (const row of validRows) {
            await addToWarehouseIfNew(row.full_name, row.phone, row.address);
          }
        }
        setUploading(false);
        setFile(null);
      },
    });
  };
  const addFromSearch = async (house: House) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return addToast("กรุณาเข้าสู่ระบบ", "error");
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
    if (error) addToast("เพิ่มไม่สำเร็จ", "error");
    else {
      addToast("เพิ่มจากคลังแล้ว!", "success");
      setSearchTerm("");
    }
  };
  // ฟังก์ชันสแกน QR / ดึงข้อมูลพัสดุ (simulate ด้วย input แล้ว query Supabase - สมมติมี table "parcels")
  const handleScanParcel = async () => {
    if (!parcelId.trim()) {
      addToast("กรุณากรอกหมายเลขพัสดุ", "error");
      return;
    }
    setScanning(true);
    try {
      // Query จาก Supabase (สมมติ table "parcels" มี parcel_id, full_name, phone, address)
      const { data, error } = await supabase
        .from("parcels") // ถ้ายังไม่มี table นี้ ต้องเพิ่มใน SQL
        .select("*")
        .eq("parcel_id", parcelId.trim())
        .single();
      if (error || !data) {
        addToast("ไม่พบข้อมูลพัสดุนี้", "error");
        return;
      }
      // เติมข้อมูลลง form
      setScannedData(data);
      setFullName(data.full_name);
      setPhone(data.phone);
      setAddress(data.address);
      addToast("ดึงข้อมูลพัสดุสำเร็จ! เติมลงฟอร์มแล้ว", "success");
      // เปลี่ยน tab ไป manual เพื่อยืนยัน
      setActiveTab("manual");
    } catch (err) {
      addToast("เกิดข้อผิดพลาดในการสแกน", "error");
    } finally {
      setScanning(false);
      setParcelId(""); // รีเซ็ต input
    }
  };
  // ฟังก์ชันดาวน์โหลดไฟล์ CSV ตัวอย่าง
  const downloadCsvExample = () => {
    const csvContent = `full_name,phone,address
สมชาย ใจดี,0812345678,"123 หมู่ 1 ต.นาโบสถ์ อ.วังเจ้า จ.ตาก"
สมศรี สุขใจ,0898765432,"456 หมู่ 5 ต.แม่กาษา อ.เมืองตาก จ.ตาก"`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "example.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-4 font-medium text-sm transition ${
                activeTab === "search"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Search className="w-5 h-5 mx-auto mb-1" />
              จากคลัง
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-4 font-medium text-sm transition ${
                activeTab === "manual"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <UserPlus className="w-5 h-5 mx-auto mb-1" />
              กรอกเอง
            </button>
            <button
              onClick={() => setActiveTab("file")}
              className={`flex-1 py-4 font-medium text-sm transition ${
                activeTab === "file"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 mx-auto mb-1" />
              CSV
            </button>
            <button // tab ใหม่: สแกน QR
              onClick={() => setActiveTab("scan")}
              className={`flex-1 py-4 font-medium text-sm transition ${
                activeTab === "scan"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Camera className="w-5 h-5 mx-auto mb-1" />
              สแกน QR
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-gray-800">
            {/* ค้นหาจากคลัง */}
            {activeTab === "search" && (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, เบอร์, ที่อยู่..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {filteredHouses.length > 0 ? (
                    filteredHouses.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {h.full_name}
                          </p>
                          <p className="text-xs text-gray-600">{h.phone}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {h.address}
                          </p>
                        </div>
                        <button
                          onClick={() => addFromSearch(h)}
                          className="ml-3 bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : searchTerm ? (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      ไม่พบข้อมูล
                    </p>
                  ) : (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      พิมพ์เพื่อค้นหาจากคลัง
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* กรอกเอง */}
            {activeTab === "manual" && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                  required
                />
                <textarea
                  placeholder="ที่อยู่เต็ม"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}
                </button>
              </form>
            )}
            {/* CSV */}
            {activeTab === "file" && (
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
            )}
            {/* สแกน QR Code (tab ใหม่) */}
            {activeTab === "scan" && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    กรอกหมายเลขพัสดุเพื่อดึงข้อมูล
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="หมายเลขพัสดุ (เช่น ABC123456)"
                    value={parcelId}
                    onChange={(e) => setParcelId(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleScanParcel}
                    disabled={scanning || !parcelId.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {scanning ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "สแกน"
                    )}
                  </button>
                </div>
                {scannedData && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm text-green-800 font-medium">
                      ดึงข้อมูลได้แล้ว!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {scannedData.full_name}
                    </p>
                    <p className="text-xs text-green-700">
                      {scannedData.phone}
                    </p>
                    <p className="text-xs text-green-700">
                      {scannedData.address}
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab("manual");
                        setScannedData(null);
                      }}
                      className="mt-2 text-xs text-green-600 underline"
                    >
                      ไปยืนยันและเพิ่ม
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Modal ตัวอย่าง CSV */}
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
                <h3 className="font-bold text-lg">ตัวอย่าง CSV</h3>
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
        {/* Toast */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-in slide-in-from-top ${t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-blue-600"}`}
            >
              {t.type === "success" && <CheckCircle className="w-5 h-5" />}
              {t.type === "error" && <XCircle className="w-5 h-5" />}
              {t.type === "info" && <AlertCircle className="w-5 h-5" />}
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
