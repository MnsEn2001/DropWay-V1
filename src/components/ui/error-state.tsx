import type { ReactNode } from "react";
import { OctagonAlert, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "โหลดข้อมูลไม่สำเร็จ",
  description = "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองโหลดอีกครั้ง",
  onRetry,
  retryLabel = "ลองอีกครั้ง",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-danger-100 bg-danger-50/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-danger-600 shadow-card">
        <OctagonAlert className="size-7" aria-hidden="true" />
      </span>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
