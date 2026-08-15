"use client";

import { LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe } from "../../lib/api";
import {
  clearPetaniSession,
  getStoredPetaniSession,
  PETANI_SESSION_EVENT,
  savePetaniSession,
  type PetaniSession
} from "../../lib/auth";

function contactLabel(session: PetaniSession) {
  return session.user.phone ?? session.user.email ?? session.user.username;
}

function roleLabel(session: PetaniSession) {
  if (session.user.role === "PETANI" && session.user.verificationStatus === "KTP_VERIFIED") {
    return "Petani terverifikasi";
  }

  if (session.user.verificationStatus === "KTP_REJECTED") {
    return "KTP ditolak";
  }

  if (session.user.ktpImageName) {
    return "KTP menunggu admin";
  }

  return "Pembeli/tengkulak";
}

export function SessionStatusBar() {
  const [session, setSession] = useState<PetaniSession | null>(null);

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
        const nextSession = { ...session, user };
        savePetaniSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (!isActive) return;
        clearPetaniSession();
        setSession(null);
      });

    return () => {
      isActive = false;
    };
  }, [session?.token]);

  if (!session) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
        <div>
          <h2 className="text-sm font-semibold text-ink">Belum masuk</h2>
          <p className="mt-1 text-sm text-slate-600">Masuk untuk bidding, komitmen, atau akses petani.</p>
        </div>
        <Link
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white"
          href="/login"
        >
          <LogIn size={17} />
          Masuk
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-field text-ink">
          <UserRound size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{session.user.name}</h2>
          <p className="truncate text-xs font-medium text-slate-600">
            {roleLabel(session)} - {contactLabel(session)}
          </p>
        </div>
      </div>
      <button
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        type="button"
        onClick={() => {
          clearPetaniSession();
          setSession(null);
        }}
      >
        <LogOut size={16} />
        Keluar
      </button>
    </section>
  );
}
