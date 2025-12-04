// src/components/layout/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Home, Package, Upload, Route, MapPin } from "lucide-react";

const menus = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: Home },
  { href: "/dashboard/houses", label: "คลังบ้าน", icon: Package },
  { href: "/dashboard/routes/upload", label: "อัพโหลดวันนี้", icon: Upload },
  { href: "/dashboard/routes/income", label: "คำนวณรายได้", icon: Route },
  { href: "/dashboard/routes/navigate", label: "นำทางส่งของ", icon: MapPin },
];

export function Sidebar() {
  const pathname = usePathname();

  // คำนวณ active item ที่ match มากที่สุด (longest path) เพื่อให้ highlight แค่ 1 ปุ่ม
  const activeItem = useMemo(() => {
    return menus
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(item.href + "/"),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];
  }, [pathname]);

  const activeHref = activeItem?.href || "";

  return (
    <aside className="hidden lg:block w-72 bg-gray-900 text-white h-screen sticky top-16">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">Dropway</h1>
          <p className="text-sm text-gray-400 mt-1">ระบบส่งของจ.ตาก</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menus.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-lg font-semibold"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {active && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-gray-800 text-center text-xs text-gray-500">
          © 2025 Dropway • จ.ตาก
        </div>
      </div>
    </aside>
  );
}
