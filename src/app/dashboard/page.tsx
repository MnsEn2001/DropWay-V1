"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Home,
  MapPin,
  RefreshCw,
  TrendingUp,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { QuickAction } from "@/components/ui/quick-action";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ActivityItem {
  action: string;
  time: string;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "เมื่อกี้";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  return `${diffDays} วันที่แล้ว`;
}

export default function DashboardPage() {
  const [totalHouses, setTotalHouses] = useState(0);
  const [todayHouses, setTodayHouses] = useState(0);
  const [pendingHouses, setPendingHouses] = useState(0);
  const [userName, setUserName] = useState("เพื่อน");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [coordPercent, setCoordPercent] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setUserName(user?.email?.split("@")[0] || "เพื่อน");

        const { count: totalCount } = await supabase
          .from("houses")
          .select("*", { count: "exact", head: true });
        if (cancelled) return;
        setTotalHouses(totalCount || 0);

        const { data: todayData } = await supabase.rpc(
          "refresh_and_merge_today_houses",
        );
        if (cancelled) return;
        setTodayHouses(todayData?.length || 0);

        const { count: pendingCount } = await supabase
          .from("pending_houses")
          .select("*", { count: "exact", head: true });
        if (cancelled) return;
        setPendingHouses(pendingCount || 0);

        const { count: withCoordsCount } = await supabase
          .from("houses")
          .select("*", { count: "exact", head: true })
          .not("lat", "is", null)
          .not("lng", "is", null);
        if (cancelled) return;

        const safeTotal = totalCount || 0;
        const safeWithCoords = withCoordsCount || 0;
        setCoordPercent(
          safeTotal > 0 ? Math.round((safeWithCoords / safeTotal) * 100) : 0,
        );

        const { data: activities } = await supabase
          .from("audits")
          .select("action, created_at")
          .limit(5)
          .order("created_at", { ascending: false });
        if (cancelled) return;

        setRecentActivities(
          activities?.map((a) => ({
            action: (a.action as string) || "เพิ่มบ้านใหม่",
            time: formatTimeAgo(a.created_at as string),
          })) || [],
        );
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        if (!cancelled) {
          setError(
            "โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          setLastUpdated(new Date());
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
  };

  const getTip = () => {
    if (todayHouses > 15)
      return "งานวันนี้เยอะ! ลองเรียงเส้นทางก่อนออกเดินทางนะ";
    if (pendingHouses > 5)
      return `มีงานค้าง ${pendingHouses} รายการ ลองดึงมาใช้ดู`;
    if (coordPercent < 70)
      return `มีบ้าน ${100 - coordPercent}% ที่ยังไม่มีพิกัด ลองเพิ่มดู`;
    return null;
  };

  const tip = getTip();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        title="ภาพรวม"
        description={`ยินดีต้อนรับกลับ ${userName} · อัปเดตล่าสุด ${lastUpdated.toLocaleTimeString(
          "th-TH",
        )}`}
        icon={Home}
        actions={
          <Button variant="secondary" onClick={refresh} loading={refreshing}>
            <RefreshCw className="size-4" aria-hidden="true" />
            รีเฟรชข้อมูล
          </Button>
        }
      />

      {error && !loading ? (
        <ErrorState
          title="โหลดข้อมูลแดชบอร์ดไม่สำเร็จ"
          description={error}
          onRetry={refresh}
        />
      ) : (
        <>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {tip && (
                <Alert variant="info" className="mb-6">
                  {tip}
                </Alert>
              )}

              {/* Quick actions */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <QuickAction
                  href="/dashboard/houses"
                  icon={MapPin}
                  tone="primary"
                  title="จัดการคลังบ้าน"
                  description="เพิ่ม แก้ไข และกรองรายชื่อบ้านทั้งหมด"
                />
                <QuickAction
                  href="/dashboard/routes/navigate"
                  icon={MapPin}
                  tone="success"
                  title="เริ่มนำทางส่งของ"
                  description="เรียงเส้นทางและออกเดินทางวันนี้"
                />
                <QuickAction
                  href="/dashboard/houses?tab=csv"
                  icon={Upload}
                  tone="info"
                  title="นำเข้าบ้านด้วย CSV"
                  description="อัพโหลดรายชื่อบ้านชุดใหม่เข้าคลัง"
                />
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="บ้านทั้งหมดในคลัง"
                  value={totalHouses}
                  icon={MapPin}
                  tone="primary"
                  hint="ข้อมูลกลางที่ทุกคนใช้ร่วมกัน"
                />
                <StatCard
                  label="งานวันนี้"
                  value={todayHouses}
                  icon={Clock}
                  tone="success"
                  hint="อยู่ในคิวส่งของวันนี้"
                />
                <StatCard
                  label="งานค้าง"
                  value={pendingHouses}
                  icon={AlertCircle}
                  tone="warning"
                  hint="รอการดึงเข้าคิววันนี้"
                  badge={
                    pendingHouses > 0 ? (
                      <StatusBadge status="PENDING" />
                    ) : undefined
                  }
                />
                <StatCard
                  label="บ้านที่มีพิกัด"
                  value={`${coordPercent}%`}
                  icon={TrendingUp}
                  tone="info"
                  hint="พร้อมนำทางด้วย Google Maps"
                />
              </div>

              {/* Recent activity */}
              <Card className="mt-6 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-5">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Clock className="size-4 text-slate-400" aria-hidden="true" />
                    กิจกรรมล่าสุด
                  </h2>
                </div>
                {recentActivities.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="ยังไม่มีกิจกรรม"
                    description="เมื่อมีการเพิ่มหรือแก้ไขข้อมูล ระบบจะแสดงรายการล่าสุดที่นี่"
                    className="py-10"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>กิจกรรม</TableHead>
                        <TableHead>เวลา</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivities.slice(0, 5).map((activity, index) => (
                        <TableRow key={`${activity.action}-${index}`}>
                          <TableCell className="font-medium text-slate-800">
                            {activity.action}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {activity.time}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>

              {/* Primary CTA */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/routes/navigate"
                  className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
                >
                  เริ่มนำทางส่งของวันนี้
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
