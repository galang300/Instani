import { ArrowLeft, ShoppingBasket, Sprout } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "../components/StatusPill";
import { PetaniAccountPanel } from "../features/auth/PetaniAccountPanel";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white/88 px-4 py-4 shadow-soft backdrop-blur">
        <Link
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          href="/"
        >
          <ArrowLeft size={16} />
          Beranda
        </Link>
        <div className="flex flex-wrap gap-2">
          <StatusPill icon={<ShoppingBasket size={15} />} tone="normal">
            Pembeli
          </StatusPill>
          <StatusPill icon={<Sprout size={15} />} tone="normal">
            Petani jika KTP disetujui
          </StatusPill>
        </div>
      </header>

      <PetaniAccountPanel />

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          href="/pembeli"
        >
          <ShoppingBasket size={17} />
          Buka fitur pembeli
        </Link>
        <Link
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-leaf px-4 py-3 text-sm font-semibold text-white"
          href="/petani"
        >
          <Sprout size={17} />
          Buka fitur petani
        </Link>
      </section>
    </main>
  );
}
