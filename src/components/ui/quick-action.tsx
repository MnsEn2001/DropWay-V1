import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickActionTone = "primary" | "success" | "info" | "warning" | "danger";

const toneClasses: Record<QuickActionTone, string> = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-success-50 text-success-600",
  info: "bg-info-50 text-info-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
};

export interface QuickActionProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: QuickActionTone;
  className?: string;
}

export function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  tone = "primary",
  className,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            toneClasses[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <ArrowRight
          className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500"
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      )}
    </Link>
  );
}
