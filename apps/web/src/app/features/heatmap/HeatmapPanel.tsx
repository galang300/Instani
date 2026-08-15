"use client";

import dynamic from "next/dynamic";

const PriceMap = dynamic(() => import("./PriceMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[360px] place-items-center rounded-lg border border-slate-200 bg-field text-sm font-medium text-slate-600">
      Memuat peta
    </div>
  )
});

export function HeatmapPanel() {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Peta harga live</h2>
          <p className="mt-1 text-sm text-slate-600">
            Titik dari laporan tersimpan dan lokasi browser saat ini.
          </p>
        </div>
      </div>
      <PriceMap />
    </section>
  );
}
