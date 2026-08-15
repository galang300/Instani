"use client";

import { CalendarDays, Gift, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiRequestError, getMyFarmerPerformance, type FarmerPerformanceSummary } from "../../lib/api";
import { getStoredPetaniSession, PETANI_SESSION_EVENT, type PetaniSession } from "../../lib/auth";

function isVerifiedFarmer(session: PetaniSession | null) {
  return session?.user.role === "PETANI" && session.user.verificationStatus === "KTP_VERIFIED";
}

function formatCurrency(value?: number) {
  if (!value) return "";
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function FarmerPerformancePanel() {
  const [session, setSession] = useState<PetaniSession | null>(null);
  const [summary, setSummary] = useState<FarmerPerformanceSummary | null>(null);
  const [status, setStatus] = useState("Memuat rating");

  useEffect(() => {
    const syncSession = () => setSession(getStoredPetaniSession());
    syncSession();
    window.addEventListener(PETANI_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(PETANI_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    if (!isVerifiedFarmer(session)) {
      setSummary(null);
      setStatus("Poin aktif setelah verifikasi petani");
      return;
    }

    let isActive = true;
    getMyFarmerPerformance()
      .then((payload) => {
        if (!isActive) return;
        setSummary(payload);
        setStatus(payload.reportCount > 0 ? `${payload.reportCount} laporan` : "Belum ada laporan");
      })
      .catch((error) => {
        if (!isActive) return;
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) {
          setStatus("Masuk sebagai petani terverifikasi");
          return;
        }
        setStatus(error instanceof Error ? error.message : "Gagal memuat rating");
      });

    return () => {
      isActive = false;
    };
  }, [session?.token, session?.user.role, session?.user.verificationStatus]);

  const latestReward = summary?.rewards[0];
  const latestDailyReports = summary?.dailyReports.slice(-5).reverse() ?? [];

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Reputasi dan apresiasi</h2>
          <p className="mt-1 text-sm text-slate-600">
            Poin kinerja dari laporan harga bulan {summary?.monthLabel ?? "berjalan"}.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Star size={17} />
            Poin kinerja
          </span>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {summary?.pointTotal ?? "-"}
            <span className="text-sm text-slate-500"> poin</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {summary?.performanceLabel ?? "Belum ada laporan"}
          </p>
        </div>

        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Gift size={17} />
            Benefit terakhir
          </span>
          {latestReward ? (
            <>
              <p className="mt-2 text-base font-semibold text-ink">
                {latestReward.benefitTitle} {formatCurrency(latestReward.benefitValue)}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {latestReward.benefitDescription ?? latestReward.note ?? "Apresiasi dari admin"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {summary
                ? `${summary.pointTotal}/${summary.voucherThreshold} poin menuju voucher otomatis.`
                : "Benefit akan muncul setelah poin laporan mencukupi."}
            </p>
          )}
        </div>
      </div>

      {latestDailyReports.length ? (
        <div className="mt-4 divide-y divide-slate-100">
          {latestDailyReports.map((item) => (
            <article key={item.date} className="grid gap-1 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <CalendarDays size={15} />
                  {item.dayName} - {item.reportCount} laporan
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {item.points} poin
                </p>
              </div>
              <p className="text-sm text-slate-600">
                High {item.highCount}, normal {item.normalCount}, rendah/anomali{" "}
                {item.lowCount + item.insufficientDataCount}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
