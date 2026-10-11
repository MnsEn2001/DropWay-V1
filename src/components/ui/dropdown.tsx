"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue>({
  close: () => undefined,
});

export interface DropdownProps {
  /** ปุ่มที่ใช้เปิดเมนู */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  /** aria-label สำหรับปุ่มเปิดเมนู */
  label?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  label,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center rounded-lg focus-visible:outline-2"
      >
        {trigger}
      </button>
      {open && (
        <DropdownContext.Provider value={{ close }}>
          <div
            role="menu"
            className={cn(
              "absolute z-50 mt-2 min-w-48 animate-scale-in rounded-xl border border-slate-200 bg-surface py-1 shadow-elevated",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "danger";
  icon?: ReactNode;
}

export function DropdownItem({
  children,
  onClick,
  href,
  tone = "default",
  icon,
}: DropdownItemProps) {
  const { close } = useContext(DropdownContext);
  const className = cn(
    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors",
    tone === "danger"
      ? "text-danger-600 hover:bg-danger-50"
      : "text-slate-700 hover:bg-slate-50",
  );

  if (href) {
    return (
      <a href={href} role="menuitem" className={className} onClick={close}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onClick={() => {
        onClick?.();
        close();
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-slate-100" role="separator" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3.5 pb-1 pt-2 text-xs font-medium text-slate-400">
      {children}
    </p>
  );
}
