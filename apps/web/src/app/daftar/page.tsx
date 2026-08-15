import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "../components/StatusPill";
import { PetaniRegisterForm } from "../features/auth/PetaniRegisterForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white/88 px-4 py-4 shadow-soft backdrop-blur">
        <Link
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          href="/"
        >
          <ArrowLeft size={16} />
          Beranda
        </Link>
        <StatusPill icon={<ShieldCheck size={15} />} tone="normal">
          Akun pengguna
        </StatusPill>
      </header>

      <PetaniRegisterForm />
    </main>
  );
}
