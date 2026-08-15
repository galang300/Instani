"use client";

import { KeyRound, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { registerPetani, type ContactMethod } from "../../lib/api";
import { savePetaniSession } from "../../lib/auth";

export function PetaniRegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("PHONE");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Siap daftar");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const target = contactMethod === "PHONE" ? phone.trim() : email.trim();
    if (!username.trim() || !password || !target) {
      setStatus("Lengkapi username, kontak, dan kata sandi");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextSession = await registerPetani({
        username: username.trim(),
        password,
        contactMethod,
        phone: contactMethod === "PHONE" ? phone.trim() : undefined,
        email: contactMethod === "EMAIL" ? email.trim() : undefined
      });
      savePetaniSession(nextSession);
      setStatus("Akun pengguna aktif");
      router.push("/login");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pendaftaran gagal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-ink">Daftar baru</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Buat akun pengguna. Tanpa verifikasi KTP, akun berjalan sebagai pembeli/tengkulak.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {status}
        </span>
      </div>

      <form className="mt-5 grid gap-5" onSubmit={submitRegistration}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Username
            <span className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="focus-ring w-full rounded-md border border-slate-200 px-10 py-2"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </span>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Kata sandi
            <span className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="focus-ring w-full rounded-md border border-slate-200 px-10 py-2"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
          </label>
        </div>

        <div className="grid gap-3">
          <h2 className="text-sm font-semibold text-ink">Kontak login</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className={`focus-ring inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                contactMethod === "PHONE"
                  ? "border-leaf bg-leaf text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              type="button"
              onClick={() => setContactMethod("PHONE")}
            >
              <Phone size={17} />
              Nomor telepon
            </button>
            <button
              className={`focus-ring inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                contactMethod === "EMAIL"
                  ? "border-leaf bg-leaf text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              type="button"
              onClick={() => setContactMethod("EMAIL")}
            >
              <Mail size={17} />
              Email
            </button>
          </div>

          {contactMethod === "PHONE" ? (
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Nomor telepon
              <input
                className="focus-ring rounded-md border border-slate-200 px-3 py-2"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          ) : (
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Email
              <input
                className="focus-ring rounded-md border border-slate-200 px-3 py-2"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
        </div>

        <button
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-fit"
          type="submit"
          disabled={isSubmitting}
        >
          <ShieldCheck size={17} />
          Daftar
        </button>
      </form>
    </section>
  );
}
