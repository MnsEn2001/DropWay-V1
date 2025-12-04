// src/components/layout/Navbar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  LogOut,
  Menu,
  Home,
  Upload,
  Route,
  MapPin,
  User as UserIcon,
  LogIn,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client"; // แก้ตรงนี้แค่บรรทัดเดียว!
import { User } from "@supabase/supabase-js";
import { useState, useMemo, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    const getInitialUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) setUser(user);
    };
    getInitialUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const menuItems = user
    ? [
        { href: "/dashboard", label: "แดชบอร์ด", icon: Home },
        { href: "/dashboard/houses", label: "คลังบ้าน", icon: Package },
        {
          href: "/dashboard/routes/navigate",
          label: "นำทางส่งของ",
          icon: MapPin,
        },
      ]
    : [
        { href: "/", label: "หน้าแรก", icon: Home },
        { href: "/login", label: "เข้าสู่ระบบ", icon: LogIn },
        { href: "/signup", label: "สมัครสมาชิก", icon: UserIcon },
      ];

  const activeItem = useMemo(() => {
    return menuItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(item.href + "/"),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];
  }, [pathname, menuItems]);

  const activeHref = activeItem?.href || "";

  return (
    <>
      {/* Navbar หลัก - อยู่ด้านบนสุด */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition text-gray-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="flex items-center gap-3">
              <Package className="w-9 h-9 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Dropway</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">ออกจากระบบ</span>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-md transition"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer - เริ่มใต้ Navbar (top-16) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar - เริ่มจาก top-16 ใต้ Navbar */}
        <aside
          className={`absolute top-16 left-0 bottom-0 w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out z-50
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-800">
              <h1 className="text-2xl font-bold">Dropway</h1>
              <p className="text-sm text-gray-400 mt-1">ระบบส่งของจ.ตาก</p>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-200
                      ${
                        active
                          ? "bg-blue-600 text-white shadow-lg font-semibold"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-base">{item.label}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Logout button for mobile - only show if user is logged in */}
            {user && (
              <div className="px-4 py-6 border-t border-gray-800">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-200 text-gray-300 hover:bg-red-600 hover:text-white"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-base">ออกจากระบบ</span>
                </button>
              </div>
            )}

            <div className="p-6 border-t border-gray-800 text-center text-xs text-gray-500">
              © 2025 Dropway • จ.ตาก
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
