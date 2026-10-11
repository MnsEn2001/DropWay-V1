"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: string;
  containerClassName?: string;
}

export function Checkbox({
  label,
  description,
  id,
  className,
  containerClassName,
  ...props
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center gap-2.5",
        containerClassName,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          "size-4 shrink-0 cursor-pointer rounded accent-primary-600",
          className,
        )}
        {...props}
      />
      <span className="text-sm text-slate-700">
        {label}
        {description && (
          <span className="block text-xs text-slate-500">{description}</span>
        )}
      </span>
    </label>
  );
}
