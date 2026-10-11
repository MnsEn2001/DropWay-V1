import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost"
  | "ghost-primary"
  | "ghost-success"
  | "ghost-danger"
  | "inverse"
  | "ghost-inverse"
  | "outline";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export type ButtonAlign = "center" | "start";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
  success: "bg-success-600 text-white hover:bg-success-700 active:bg-success-700",
  danger: "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  "ghost-primary":
    "text-primary-600 hover:bg-primary-50 hover:text-primary-700",
  "ghost-success":
    "text-success-600 hover:bg-success-50 hover:text-success-700",
  "ghost-danger": "text-danger-600 hover:bg-danger-50 hover:text-danger-700",
  inverse:
    "bg-white text-primary-700 hover:bg-primary-50 active:bg-primary-100",
  "ghost-inverse": "text-white hover:bg-white/10 hover:text-white",
  outline:
    "border border-primary-200 bg-white text-primary-700 hover:bg-primary-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-base",
  icon: "size-10",
  "icon-sm": "size-9",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
  align: ButtonAlign = "center",
): string {
  return cn(
    "inline-flex select-none items-center whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60",
    align === "start" ? "justify-start" : "justify-center",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: ButtonAlign;
  /** แสดงสถานะกำลังทำงาน แล้วปิดการกดซ้ำ */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  align = "center",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className, align)}
      {...props}
    >
      {loading && (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
