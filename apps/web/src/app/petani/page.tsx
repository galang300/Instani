import { ArrowLeft, LogIn, Sprout } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "../components/StatusPill";
import { FarmerPerformancePanel } from "../features/auth/FarmerPerformancePanel";
import { SessionStatusBar } from "../features/auth/SessionStatusBar";
import { HeatmapPanel } from "../features/heatmap/HeatmapPanel";
import { HppCalculator } from "../features/hpp-calculator/HppCalculator";
import { AnomalyPanel } from "../features/harga/AnomalyPanel";
import { PriceInputForm } from "../features/harga/PriceInputForm";
import { ReferencePricePanel } from "../features/harga/ReferencePricePanel";
import { AuctionTicker } from "../features/lelang/AuctionTicker";

export default function FarmerPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 pb-6 pt-3 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-[var(--line)] bg-white/88 px-4 py-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              href="/"
            >
              <ArrowLeft size={16} />
              Beranda
            </Link>
            <StatusPill icon={<Sprout size={15} />} tone="normal">
              Petani terverifikasi
            </StatusPill>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            Fitur petani
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Fitur ini aktif untuk akun yang sudah mengajukan KTP dan disetujui admin sebagai petani.
          </p>
        </div>
        <Link
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white"
          href="/login"
        >
          <LogIn size={17} />
          Akun pengguna
        </Link>
      </header>

      <SessionStatusBar />

      <FarmerPerformancePanel />

      <ReferencePricePanel />

      <section className="grid items-start gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <PriceInputForm />
        <AnomalyPanel />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <HeatmapPanel />
        <HppCalculator />
      </section>

      <AuctionTicker mode="farmer" />
    </main>
  );
}
