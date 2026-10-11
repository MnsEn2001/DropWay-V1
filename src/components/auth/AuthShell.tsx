import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Package } from "lucide-react";

export interface AuthShellProps {
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            href="/"
            aria-label="กลับหน้าแรก DropWay"
            className="flex size-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-card transition-colors hover:bg-primary-700"
          >
            <Package className="size-7" aria-hidden="true" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1 transition-colors hover:text-slate-600"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            กลับหน้าแรก
          </Link>
        </p>
      </div>
    </div>
  );
}
