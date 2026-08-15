import type { ReactNode } from "react";

export function MetricCard({
  icon,
  label,
  value,
  danger = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <article className={danger ? "metric danger" : "metric"}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
