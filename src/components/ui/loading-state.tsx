import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  /** จัดกลางเต็มพื้นที่หน้าจอ (หักความสูง header) */
  fullPage?: boolean;
  className?: string;
}

export function LoadingState({
  label = "กำลังโหลดข้อมูล...",
  fullPage = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-slate-500",
        fullPage && "min-h-[calc(100dvh-4rem)]",
        !fullPage && "py-14",
        className,
      )}
    >
      <Loader2 className="size-7 animate-spin text-primary-600" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
