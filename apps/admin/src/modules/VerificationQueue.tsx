import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type FarmerApplication = {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  role: string;
  verificationStatus: string;
  ktpImageName?: string;
  ktpImageDataUrl?: string;
  ktpRejectionReason?: string;
  updatedAt: string;
};

type VerificationQueueProps = {
  token: string;
  onUnauthorized: () => void;
};

async function apiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

function contactLabel(application: FarmerApplication) {
  return application.phone ?? application.email ?? application.username ?? "-";
}

export function VerificationQueue({ token, onUnauthorized }: VerificationQueueProps) {
  const [applications, setApplications] = useState<FarmerApplication[]>([]);
  const [status, setStatus] = useState("Memuat");
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState("");

  async function loadApplications() {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/farmer-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if ([401, 403].includes(response.status)) {
        onUnauthorized();
        throw new Error("Login admin diperlukan");
      }
      if (!response.ok) {
        throw new Error(await apiError(response, "Gagal mengambil pengajuan KTP"));
      }

      const payload = (await response.json()) as FarmerApplication[];
      setApplications(payload);
      setStatus(payload.length > 0 ? `${payload.length} menunggu` : "Kosong");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memuat");
    } finally {
      setIsLoading(false);
    }
  }

  async function decideApplication(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject"
        ? window.prompt("Alasan penolakan", "Data KTP belum sesuai")?.trim()
        : undefined;
    if (action === "reject" && !reason) {
      setStatus("Penolakan dibatalkan");
      return;
    }

    setActiveId(id);
    try {
      const response = await fetch(`${API_URL}/api/users/farmer-applications/${id}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(reason ? { "Content-Type": "application/json" } : {})
        },
        body: reason ? JSON.stringify({ reason }) : undefined
      });
      if ([401, 403].includes(response.status)) {
        onUnauthorized();
        throw new Error("Login admin diperlukan");
      }
      if (!response.ok) {
        throw new Error(await apiError(response, "Gagal memproses pengajuan"));
      }

      setStatus(action === "approve" ? "Petani disetujui" : "Pengajuan ditolak");
      await loadApplications();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memproses");
    } finally {
      setActiveId("");
    }
  }

  useEffect(() => {
    void loadApplications();
  }, [token]);

  return (
    <section className="panel" id="verifikasi">
      <div className="panel-title">
        <h3>Verifikasi KTP petani</h3>
        <span>{status}</span>
      </div>

      <button className="refresh-button" type="button" disabled={isLoading} onClick={loadApplications}>
        <RefreshCw size={16} />
        Muat ulang
      </button>

      <div className="table">
        {applications.length === 0 ? (
          <p className="empty-state">Belum ada pengajuan KTP.</p>
        ) : (
          applications.map((application) => (
            <article key={application.id} className="row verification">
              <div className="verification-detail">
                {application.ktpImageDataUrl ? (
                  <img src={application.ktpImageDataUrl} alt={`KTP ${application.name}`} />
                ) : null}
                <div>
                  <strong>{application.name}</strong>
                  <p>{contactLabel(application)}</p>
                  <small>{application.ktpImageName ?? "Foto KTP"}</small>
                </div>
              </div>
              <div className="verification-actions">
                <button
                  className="approve"
                  type="button"
                  disabled={activeId === application.id}
                  onClick={() => void decideApplication(application.id, "approve")}
                >
                  <CheckCircle2 size={16} />
                  Setujui
                </button>
                <button
                  className="reject"
                  type="button"
                  disabled={activeId === application.id}
                  onClick={() => void decideApplication(application.id, "reject")}
                >
                  <XCircle size={16} />
                  Tolak
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
