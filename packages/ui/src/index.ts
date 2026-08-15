export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const statusTone = {
  LOW: "bg-red-100 text-red-800 border-red-200",
  NORMAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
  HIGH: "bg-amber-100 text-amber-800 border-amber-200",
  INSUFFICIENT_DATA: "bg-slate-100 text-slate-700 border-slate-200"
} as const;
