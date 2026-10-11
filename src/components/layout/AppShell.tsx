"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Navigation,
  Package,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel } from "@/components/ui/dropdown";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/dashboard/houses", label: "คลังบ้าน", icon: Package },
  { href: "/dashboard/routes/navigate", label: "นำทางส่งของ", icon: Navigation },
];

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white",
        className,
      )}
    >
      <Package className="size-5" aria-hidden="true" />
    </span>
  );
}

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="min-w-0">
        <span className="block text-base font-bold leading-tight text-slate-900">
          DropWay
        </span>
        <span className="block text-xs text-slate-500">
          ระบบจัดเส้นทางส่งของ
        </span>
      </span>
    </span>
  );
}

export function AppShell({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(initialUser);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_IN"
      ) {
        setUser(session?.user ?? null);
      }

      // Auto-refresh ถ้า token ใกล้หมด
      if (session) {
        const expiresAt = session.expires_at ?? 0;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt - now < 600) {
          await supabase.auth.refreshSession();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const email = user?.email ?? "";
  const displayName = email ? email.split("@")[0] : "ผู้ใช้งาน";

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isDashboardArea = pathname.startsWith("/dashboard");

  const activeHref = NAV_ITEMS.reduce((prev, curr) => {
    if (pathname.startsWith(curr.href) && curr.href.length > prev.length) {
      return curr.href;
    }
    return prev;
  }, "");
  const sectionLabel =
    NAV_ITEMS.find((item) => item.href === activeHref)?.label ?? "ภาพรวม";

  // หน้า login/signup แสดงเต็มหน้าจอ ไม่มี chrome
  if (isAuthPage) {
    return <>{children}</>;
  }

  // ผู้ใช้ที่ล็อกอินแล้วในพื้นที่หลังบ้าน: Sidebar + Topbar + Bottom Navigation
  if (user && isDashboardArea) {
    return (
      <>
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-16 items-center border-b border-slate-100 px-5">
            <Link href="/dashboard" aria-label="DropWay ภาพรวม">
              <Brand />
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-3" aria-label="เมนูหลัก">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-50 font-semibold text-primary-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-1 border-t border-slate-100 p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar name={email} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500">{email}</p>
              </div>
            </div>
            <Button
              variant="ghost-danger"
              align="start"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="size-4" aria-hidden="true" />
              ออกจากระบบ
            </Button>
          </div>
        </aside>

        {/* Topbar (mobile + desktop) */}
        <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur lg:pl-64">
          <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 lg:hidden"
                aria-label="DropWay ภาพรวม"
              >
                <BrandMark className="size-8" />
                <span className="text-base font-bold text-slate-900">
                  DropWay
                </span>
              </Link>
              <div className="hidden lg:block">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  DropWay
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {sectionLabel}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Dropdown
                className="hidden lg:block"
                label="เมนูบัญชี"
                trigger={
                  <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100">
                    <Avatar name={email} />
                    <span className="max-w-32 truncate text-sm font-medium text-slate-700">
                      {displayName}
                    </span>
                    <ChevronDown
                      className="size-4 text-slate-400"
                      aria-hidden="true"
                    />
                  </span>
                }
              >
                <DropdownLabel>เข้าสู่ระบบด้วย</DropdownLabel>
                <p className="max-w-56 truncate px-3.5 pb-2 text-xs text-slate-500">
                  {email}
                </p>
                <DropdownDivider />
                <DropdownItem
                  tone="danger"
                  icon={<LogOut className="size-4" aria-hidden="true" />}
                  onClick={handleLogout}
                >
                  ออกจากระบบ
                </DropdownItem>
              </Dropdown>

              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label="เปิดเมนูบัญชี"
                className="rounded-full lg:hidden"
              >
                <Avatar name={email} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <nav
          aria-label="เมนูด้านล่าง"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div className="grid grid-cols-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                    active
                      ? "text-primary-700"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile account drawer */}
        <Drawer
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          title="บัญชีของฉัน"
        >
          <div className="flex items-center gap-3">
            <Avatar name={email} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>
          <Button
            variant="ghost-danger"
            align="start"
            className="mt-5 w-full"
            onClick={handleLogout}
          >
            <LogOut className="size-4" aria-hidden="true" />
            ออกจากระบบ
          </Button>
        </Drawer>

        <main className="min-h-screen pb-24 pt-16 lg:pl-64 lg:pb-10">
          {children}
        </main>
      </>
    );
  }

  // ผู้เยี่ยมชมทั่วไป / หน้า public
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="DropWay หน้าแรก">
            <Brand />
          </Link>
          <nav className="flex items-center gap-2" aria-label="เมนูหลัก">
            {user ? (
              <Link
                href="/dashboard"
                className={buttonClasses("primary", "md")}
              >
                ไปที่แดชบอร์ด
              </Link>
            ) : (
              <>
                <span className="hidden sm:inline-block">
                  <Link href="/login" className={buttonClasses("ghost", "md")}>
                    เข้าสู่ระบบ
                  </Link>
                </span>
                <Link
                  href="/signup"
                  className={buttonClasses("primary", "md")}
                >
                  สมัครสมาชิกฟรี
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="min-h-screen pt-16">{children}</main>
    </>
  );
}
