import { ReactNode } from "react";

const toneClass = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  muted: "border-slate-200 bg-slate-50 text-slate-700"
} as const;

export function StatusPill({
  children,
  icon,
  tone = "muted"
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
