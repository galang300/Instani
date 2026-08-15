import { AlertTriangle, Database, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearAdminSession,
  getStoredAdminSession,
  saveAdminSession,
  type AdminSession,
  type AdminUser
} from "./lib/admin-auth";
import { MetricCard } from "./components/MetricCard";
import { AnomalyQueue } from "./modules/AnomalyQueue";
import { FarmerRatingPanel } from "./modules/FarmerRatingPanel";
import { VerificationQueue } from "./modules/VerificationQueue";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type HargaStats = {
  sampleToday: number;
  lowPriceCount: number;
  notificationCount: number;
};

const emptyHargaStats: HargaStats = {
  sampleToday: 0,
  lowPriceCount: 0,
  notificationCount: 0
};

async function apiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [identifier, setIdentifier] = useState("admin@panganterkini.local");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Masuk admin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hargaStats, setHargaStats] = useState<HargaStats>(emptyHargaStats);

  useEffect(() => {
    const storedSession = getStoredAdminSession();
    if (!storedSession) return;

    fetch(`${API_URL}/api/auth/admin/me`, {
      headers: { Authorization: `Bearer ${storedSession.token}` }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await apiError(response, "Sesi admin berakhir"));
        }

        const user = (await response.json()) as AdminUser;
        const nextSession = { ...storedSession, user };
        saveAdminSession(nextSession);
        setSession(nextSession);
      })
      .catch((error) => {
        clearAdminSession();
        setStatus(error instanceof Error ? error.message : "Sesi admin berakhir");
      });
  }, []);

  useEffect(() => {
    if (!session) return;

    fetch(`${API_URL}/api/harga/stats`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await apiError(response, "Gagal memuat statistik harga"));
        }
        setHargaStats((await response.json()) as HargaStats);
      })
      .catch(() => setHargaStats(emptyHargaStats));
  }, [session?.token]);

  async function submitLogin() {
    if (!identifier.trim() || !password) {
      setStatus("Isi email admin dan kata sandi");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password
        })
      });

      if (!response.ok) {
        throw new Error(await apiError(response, "Login admin gagal"));
      }

      const nextSession = (await response.json()) as AdminSession;
      saveAdminSession(nextSession);
      setSession(nextSession);
      setPassword("");
      setStatus(`Aktif: ${nextSession.user.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login admin gagal");
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    clearAdminSession();
    setSession(null);
    setStatus("Masuk admin");
  }

  if (!session) {
    return (
      <main className="admin-login">
        <section className="admin-login-card">
          <div>
            <p className="eyebrow">Admin Tulungagung</p>
            <h1>PanganTerkini</h1>
            <p>Masuk untuk memproses pengajuan KTP dan mengubah hak akses petani.</p>
          </div>
          <label>
            Email admin
            <input
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>
          <label>
            Kata sandi
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="button" disabled={isSubmitting} onClick={submitLogin}>
            <LogIn size={18} />
            Masuk
          </button>
          <span>{status}</span>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <h1>PanganTerkini</h1>
        <nav>
          <a className="active" href="#monitoring">Monitoring</a>
          <a href="#verifikasi">Verifikasi</a>
          <a href="#rating-petani">Poin</a>
          <a href="#notifikasi">Notifikasi</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Admin Tulungagung</p>
            <h2>Ruang kendali harga</h2>
            <p>{session.user.name}</p>
          </div>
          <button type="button" onClick={logout}>
            <LogOut size={18} />
            Keluar
          </button>
        </header>

        <section className="metrics">
          <MetricCard icon={<Database size={20} />} label="Input hari ini" value={`${hargaStats.sampleToday}`} />
          <MetricCard icon={<AlertTriangle size={20} />} label="Anomali rendah" value={`${hargaStats.lowPriceCount}`} danger />
          <MetricCard icon={<ShieldCheck size={20} />} label="Verifikasi KTP" value="Admin" />
        </section>

        <section className="panels">
          <AnomalyQueue />
          <VerificationQueue token={session.token} onUnauthorized={logout} />
        </section>

        <FarmerRatingPanel token={session.token} onUnauthorized={logout} />
      </section>
    </main>
  );
}
