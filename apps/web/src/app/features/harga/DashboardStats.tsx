"use client";

import { Activity, BellRing, MapPin, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { getHargaStats, type HargaDashboardStats } from "../../lib/api";

const emptyStats: HargaDashboardStats = {
  sampleToday: 0,
  lowPriceCount: 0,
  averagePrice: 0,
  notificationCount: 0,
  averageSource: "NONE"
};

export function DashboardStats() {
  const [stats, setStats] = useState<HargaDashboardStats>(emptyStats);

  async function loadStats() {
    try {
      setStats(await getHargaStats());
    } catch {
      setStats(emptyStats);
    }
  }

  useEffect(() => {
    void loadStats();
    const interval = window.setInterval(() => void loadStats(), 15000);
    const refreshAfterSubmit = () => void loadStats();
    window.addEventListener("price-report-created", refreshAfterSubmit);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("price-report-created", refreshAfterSubmit);
    };
  }, []);

  const averageCaption =
    stats.averageSource === "REPORTS_TODAY"
      ? "Per kg dari laporan hari ini"
      : stats.averageSource === "PIHPS_REFERENCE"
        ? "Per kg dari referensi PIHPS"
        : "Belum ada data harga";

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        icon={<Activity size={20} />}
        label="Sampel hari ini"
        value={`${stats.sampleToday}`}
        caption="Laporan tersimpan di API"
      />
      <StatCard
        icon={<TrendingDown size={20} />}
        label="Harga rendah"
        value={`${stats.lowPriceCount}`}
        caption="Status LOW dari database"
        tone="danger"
      />
      <StatCard
        icon={<MapPin size={20} />}
        label="Rerata sampel"
        value={stats.averagePrice > 0 ? `Rp${stats.averagePrice.toLocaleString("id-ID")}` : "-"}
        caption={averageCaption}
        tone="water"
      />
      <StatCard
        icon={<BellRing size={20} />}
        label="Notifikasi"
        value={`${stats.notificationCount}`}
        caption="Berdasarkan harga rendah"
        tone="warn"
      />
    </section>
  );
}
