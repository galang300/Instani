"use client";

import { IdCard, LogIn, LogOut, ShieldCheck, Upload, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { getMe, loginPetani, submitFarmerKtpApplication } from "../../lib/api";
import {
  clearPetaniSession,
  getStoredPetaniSession,
  PETANI_SESSION_EVENT,
  savePetaniSession,
  type PetaniSession
} from "../../lib/auth";

const MAX_KTP_SIZE = 4 * 1024 * 1024;

function accountContact(session: PetaniSession) {
  return session.user.phone ?? session.user.email ?? session.user.username;
}

function roleLabel(session: PetaniSession) {
  if (session.user.role === "PETANI" && session.user.verificationStatus === "KTP_VERIFIED") {
    return "Petani terverifikasi";
  }

  if (session.user.verificationStatus === "KTP_REJECTED") {
    return "Pengajuan KTP ditolak";
  }

  if (session.user.ktpImageName) {
    return "Pengajuan KTP menunggu admin";
  }

  return "Pembeli";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Gagal membaca foto KTP"));
    reader.readAsDataURL(file);
  });
}

export function PetaniAccountPanel() {
  const [session, setSession] = useState<PetaniSession | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [ktpImageName, setKtpImageName] = useState("");
  const [ktpImageDataUrl, setKtpImageDataUrl] = useState("");
  const [status, setStatus] = useState("Akun pengguna");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

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
    if (!session) return;

    let isActive = true;
    getMe()
      .then((user) => {
        if (!isActive) return;
        setSession((currentSession) => {
          if (!currentSession) return currentSession;

          const nextSession = {
            ...currentSession,
            user
          };
          savePetaniSession(nextSession);
          return nextSession;
        });
      })
      .catch(() => {
        if (!isActive) return;
        clearPetaniSession();
        setSession(null);
        setStatus("Sesi berakhir, login ulang");
      });

    return () => {
      isActive = false;
    };
  }, [session?.token]);

  async function submitAccount() {
    if (!identifier.trim() || !password) {
      setStatus("Isi email/telepon dan kata sandi");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextSession = await loginPetani({
        identifier: identifier.trim(),
        password
      });
      savePetaniSession(nextSession);
      setSession(nextSession);
      setIdentifier(accountContact(nextSession));
      setPassword("");
      setStatus(`Aktif: ${nextSession.user.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    clearPetaniSession();
    setSession(null);
    setStatus("Akun pengguna");
  }

  async function handleKtpChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setKtpImageName("");
      setKtpImageDataUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("File KTP harus berupa gambar");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_KTP_SIZE) {
      setStatus("Ukuran foto KTP maksimal 4 MB");
      event.target.value = "";
      return;
    }

    try {
      setKtpImageDataUrl(await readFileAsDataUrl(file));
      setKtpImageName(file.name);
      setStatus("Foto KTP siap diajukan");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Foto KTP gagal dibaca");
    }
  }

  async function submitKtpApplication() {
    if (!session) {
      setStatus("Login dulu untuk mengajukan KTP");
      return;
    }

    if (!ktpImageName || !ktpImageDataUrl) {
      setStatus("Pilih foto KTP terlebih dahulu");
      return;
    }

    setIsApplying(true);
    try {
      const user = await submitFarmerKtpApplication({
        ktpImageName,
        ktpImageDataUrl
      });
      const nextSession = { ...session, user };
      savePetaniSession(nextSession);
      setSession(nextSession);
      setKtpImageName("");
      setKtpImageDataUrl("");
      setStatus("Pengajuan KTP menunggu admin");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pengajuan KTP gagal");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Akun pengguna</h2>
          <p className="mt-1 text-sm text-slate-600">
            Masuk memakai email atau telepon. Hak petani aktif setelah KTP disetujui admin.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {status}
        </span>
      </div>

      {session ? (
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-leaf shadow-sm">
                <UserRound size={19} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{session.user.name}</p>
                <p className="truncate text-xs font-medium text-slate-600">
                  {roleLabel(session)} - {accountContact(session)}
                </p>
              </div>
            </div>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              type="button"
              onClick={logout}
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>

          {session.user.role === "PETANI" && session.user.verificationStatus === "KTP_VERIFIED" ? (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Akses fitur petani sudah aktif.
            </div>
          ) : (
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Ajukan akses petani</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Unggah KTP setelah login. Admin pengelola akan mengecek apakah akun ini petani
                  di wilayah tersebut.
                </p>
              </div>
              {session.user.ktpImageName ? (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  {session.user.verificationStatus === "KTP_REJECTED"
                    ? `Ditolak: ${session.user.ktpRejectionReason ?? "Data KTP belum sesuai"}`
                    : `Pengajuan tersimpan: ${session.user.ktpImageName}`}
                </span>
              ) : null}
              <label className="focus-ring flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <IdCard size={18} className="shrink-0 text-slate-500" />
                  <span className="truncate">{ktpImageName || "Unggah foto KTP"}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                  <Upload size={16} />
                  Pilih gambar
                </span>
                <input className="sr-only" type="file" accept="image/*" onChange={handleKtpChange} />
              </label>
              <button
                className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-fit"
                type="button"
                disabled={isApplying || !ktpImageDataUrl}
                onClick={submitKtpApplication}
              >
                <ShieldCheck size={17} />
                Kirim pengajuan KTP
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Email atau telepon
              <input
                className="focus-ring rounded-md border border-slate-200 px-3 py-2"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Kata sandi
              <input
                className="focus-ring rounded-md border border-slate-200 px-3 py-2"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              type="button"
              disabled={isSubmitting}
              onClick={submitAccount}
            >
              <LogIn size={17} />
              Masuk
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Belum punya akun?</span>
            <Link
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
              href="/daftar"
            >
              <UserPlus size={16} />
              Daftar baru
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
