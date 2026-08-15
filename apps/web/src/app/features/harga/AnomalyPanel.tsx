"use client";

import type { PriceReport } from "@panganterkini/shared-types";
import { useEffect, useState } from "react";
import { getPriceReports } from "../../lib/api";

const statusClass = {
  LOW: "bg-red-100 text-red-800",
  NORMAL: "bg-emerald-100 text-emerald-800",
  HIGH: "bg-amber-100 text-amber-800",
  INSUFFICIENT_DATA: "bg-slate-100 text-slate-700"
} as const;

export function AnomalyPanel() {
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadReports() {
    try {
      const priceReports = await getPriceReports();
      setReports(priceReports.slice(0, 8));
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
    const interval = window.setInterval(() => void loadReports(), 15000);
    const refreshAfterSubmit = () => void loadReports();
    window.addEventListener("price-report-created", refreshAfterSubmit);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("price-report-created", refreshAfterSubmit);
    };
  }, []);

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Deteksi Z-Score</h2>
          <p className="mt-1 text-sm text-slate-600">Laporan harga petani hari ini.</p>
        </div>
        <span className="rounded-full border border-water/20 bg-sky-50 px-3 py-1 text-xs font-semibold text-water">
          Z + IQR
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {isLoading ? (
          <p className="py-4 text-sm font-medium text-slate-600">Memuat laporan harga...</p>
        ) : reports.length === 0 ? (
          <p className="py-4 text-sm font-medium text-slate-600">
            Belum ada laporan harga petani tersimpan.
          </p>
        ) : (
          reports.map((report) => (
            <article key={report.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold text-ink">{report.commodity}</p>
                <p className="text-sm text-slate-600">
                  {report.district} - Rp{report.pricePerKg.toLocaleString("id-ID")}/kg
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-sm font-semibold text-slate-700">
                  z {typeof report.zScore === "number" ? report.zScore.toFixed(1) : "-"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusClass[report.status ?? "INSUFFICIENT_DATA"]
                  }`}
                >
                  {report.status ?? "INSUFFICIENT_DATA"}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
