import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  Truck,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";

/**
 * DropWay Delivery Status System (UI representation only)
 * Phase นี้ยังไม่ผูกกับ business logic / database state machine
 */
export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "DELIVERED"
  | "FAILED"
  | "PROBLEM"
  | "CANCELLED"
  | "RESCHEDULED";

interface StatusMeta {
  label: string;
  tone: BadgeTone;
  dot: string;
  icon: LucideIcon;
}

export const DELIVERY_STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  PENDING: {
    label: "รอดำเนินการ",
    tone: "neutral",
    dot: "bg-slate-400",
    icon: Clock,
  },
  ASSIGNED: {
    label: "มอบหมายแล้ว",
    tone: "info",
    dot: "bg-info-500",
    icon: UserCheck,
  },
  PICKED_UP: {
    label: "รับสินค้าแล้ว",
    tone: "info",
    dot: "bg-info-500",
    icon: PackageCheck,
  },
  IN_TRANSIT: {
    label: "กำลังนำส่ง",
    tone: "primary",
    dot: "bg-primary-500",
    icon: Truck,
  },
  ARRIVED: {
    label: "ถึงจุดหมาย",
    tone: "primary",
    dot: "bg-primary-500",
    icon: MapPin,
  },
  DELIVERED: {
    label: "ส่งสำเร็จ",
    tone: "success",
    dot: "bg-success-500",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "ส่งไม่สำเร็จ",
    tone: "danger",
    dot: "bg-danger-500",
    icon: XCircle,
  },
  PROBLEM: {
    label: "ติดปัญหา",
    tone: "danger",
    dot: "bg-danger-500",
    icon: AlertTriangle,
  },
  CANCELLED: {
    label: "ยกเลิก",
    tone: "neutral",
    dot: "bg-slate-400",
    icon: Ban,
  },
  RESCHEDULED: {
    label: "เลื่อนส่งใหม่",
    tone: "warning",
    dot: "bg-warning-500",
    icon: CalendarClock,
  },
};

export interface StatusBadgeProps {
  status: DeliveryStatus;
  withIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  withIcon = false,
  className,
}: StatusBadgeProps) {
  const meta = DELIVERY_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone} className={className}>
      {withIcon ? (
        <Icon className="size-3.5" aria-hidden="true" />
      ) : (
        <StatusDot status={status} />
      )}
      {meta.label}
    </Badge>
  );
}

export interface StatusDotProps {
  status: DeliveryStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const meta = DELIVERY_STATUS_META[status];
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", meta.dot, className)}
      aria-hidden="true"
    />
  );
}

export interface StatusIconProps {
  status: DeliveryStatus;
  className?: string;
}

export function StatusIcon({ status, className }: StatusIconProps) {
  const meta = DELIVERY_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={className} role="img" aria-label={meta.label} title={meta.label}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}
