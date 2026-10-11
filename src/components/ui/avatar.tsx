import { cn } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
};

export interface AvatarProps {
  /** ชื่อหรืออีเมลที่ใช้สร้างตัวอักษรย่อ */
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700",
        sizeClasses[size],
        className,
      )}
    >
      {initial}
    </span>
  );
}
