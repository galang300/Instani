import { ReactNode } from "react";

type Tone = "normal" | "danger" | "warn" | "water";

const toneClass: Record<Tone, string> = {
  normal: "border-leaf/20 bg-white",
  danger: "border-chili/30 bg-red-50",
  warn: "border-rice/50 bg-yellow-50",
  water: "border-water/25 bg-sky-50"
};

export function StatCard({
  icon,
  label,
  value,
  caption,
  tone = "normal"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  tone?: Tone;
}) {
  return (
    <article className={`rounded-lg border p-3 shadow-sm sm:p-4 ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600 sm:text-sm">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-sm">
          {icon}
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-semibold tracking-normal text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{caption}</p>
    </article>
  );
}
