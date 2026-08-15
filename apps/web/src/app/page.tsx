import {
  ArrowRight,
  BellRing,
  CloudSun,
  LogIn,
  MessageCircle,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { StatusPill } from "./components/StatusPill";
import { DashboardStats } from "./features/harga/DashboardStats";
import { ReferencePricePanel } from "./features/harga/ReferencePricePanel";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 pb-6 pt-3 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
      <header className="sticky top-0 z-30 -mx-3 border-b border-emerald-100 bg-white/94 px-3 py-3 shadow-sm backdrop-blur sm:static sm:mx-0 sm:rounded-lg sm:border sm:border-[var(--line)] sm:px-4 sm:py-4 sm:shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-md">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-leaf text-white shadow-sm">
              <Sprout size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-black tracking-normal text-ink sm:text-2xl">
                Instani
              </p>
              <p className="truncate text-xs font-semibold text-emerald-700">
                Prototype PanganTerkini
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              href="/consult"
            >
              <MessageCircle size={16} />
              Chatbot
            </Link>
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              href="/login"
            >
              <LogIn size={16} />
              Masuk
            </Link>
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white"
              href="/daftar"
            >
              <UserPlus size={16} />
              Daftar
            </Link>
          </div>

          <Link
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-leaf sm:hidden"
            href="/consult"
            aria-label="Buka chatbot"
          >
            <MessageCircle size={19} />
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg bg-leaf text-white shadow-soft">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <StatusPill icon={<ShieldCheck size={14} />} tone="normal">
              Demo siap lomba
            </StatusPill>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-normal sm:text-4xl">
              Pantau harga, cuaca, dan anomali pangan dari satu dashboard.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
              Web prototype ini diprioritaskan untuk browser HP: petani bisa cek harga acuan,
              input laporan, buka lelang, dan konsultasi AI berbasis data lokal.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap">
              <Link
                href="/petani"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 font-bold text-leaf"
              >
                <Sprout size={17} />
                Akses petani
              </Link>
              <Link
                href="/pembeli"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-white/30 bg-white/10 px-3 py-2 font-bold text-white"
              >
                <ShoppingBasket size={17} />
                Akses pembeli
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/15 bg-white/10 p-2 backdrop-blur">
            <div className="rounded-md bg-white p-3 text-ink">
              <CloudSun className="text-water" size={20} />
              <p className="mt-3 text-xs font-semibold text-slate-500">Cuaca</p>
              <p className="text-lg font-black">BMKG</p>
            </div>
            <div className="rounded-md bg-white p-3 text-ink">
              <BellRing className="text-chili" size={20} />
              <p className="mt-3 text-xs font-semibold text-slate-500">Alert</p>
              <p className="text-lg font-black">Anomali</p>
            </div>
            <div className="rounded-md bg-white p-3 text-ink">
              <MessageCircle className="text-leaf" size={20} />
              <p className="mt-3 text-xs font-semibold text-slate-500">AI</p>
              <p className="text-lg font-black">RAG</p>
            </div>
          </div>
        </div>
      </section>

      <DashboardStats />

      <section className="grid gap-3 sm:gap-5 lg:grid-cols-2">
        <Link
          className="focus-ring group rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft transition hover:border-sky-200 hover:bg-sky-50 sm:p-5"
          href="/pembeli"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-50 text-water group-hover:bg-white">
              <ShoppingBasket size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-ink sm:text-xl">Akses pembeli/tengkulak</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Bid lelang panen, ikut group buying, dan pantau transaksi pembelian.
              </p>
            </div>
            <ArrowRight className="mt-1 shrink-0 text-slate-400" size={18} />
          </div>
        </Link>

        <Link
          className="focus-ring group rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft transition hover:border-emerald-200 hover:bg-emerald-50 sm:p-5"
          href="/petani"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-leaf group-hover:bg-white">
              <Sprout size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-ink sm:text-xl">Akses petani</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Input harga, cek anomali, hitung HPP, dan buka lelang panen setelah KTP disetujui.
              </p>
            </div>
            <ArrowRight className="mt-1 shrink-0 text-slate-400" size={18} />
          </div>
        </Link>
      </section>

      <ReferencePricePanel />

      <section className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
        <span className="inline-flex items-start gap-2">
          <BellRing size={16} />
          Notifikasi WhatsApp dan peringatan harga tetap berjalan lewat service API/worker Docker.
        </span>
      </section>
    </main>
  );
}
