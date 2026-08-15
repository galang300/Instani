import { AlertTriangle, CalendarDays, Gift, RefreshCw, Star, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type FarmerRatingPanelProps = {
  token: string;
  onUnauthorized: () => void;
};

type FarmerReward = {
  benefitTitle?: string;
  benefitDescription?: string;
  benefitValue?: number;
  benefitStatus?: string;
};

type DailyReportSummary = {
  date: string;
  dayName: string;
  reportCount: number;
  points: number;
  lowCount: number;
  normalCount: number;
  highCount: number;
  insufficientDataCount: number;
};

type MonthlyReport = {
  id: string;
  commodity: string;
  pricePerKg: number;
  volumeKg: number;
  district: string;
  village?: string;
  status?: "LOW" | "NORMAL" | "HIGH" | "INSUFFICIENT_DATA";
  points: number;
  createdAt: string;
};

type FarmerSummary = {
  id: string;
  name: string;
  contact: string;
  pointTotal: number;
  reportCount: number;
  monthlyReportCount: number;
  monthlyPointTotal: number;
  voucherEligible: boolean;
  voucherThreshold: number;
  performanceLabel: string;
  latestRating?: FarmerReward;
  dailyReports: DailyReportSummary[];
  monthlyReports?: MonthlyReport[];
  statusCounts: {
    low: number;
    normal: number;
    high: number;
    insufficientData: number;
  };
  monthLabel: string;
};

async function apiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

function formatCurrency(value?: number | null) {
  if (!value) return "";
  return `Rp${value.toLocaleString("id-ID")}`;
}

function statusLabel(status?: MonthlyReport["status"]) {
  if (status === "LOW") return "Rendah";
  if (status === "NORMAL") return "Normal";
  if (status === "HIGH") return "High";
  return "Data kurang";
}

function statusClass(status?: MonthlyReport["status"]) {
  if (status === "LOW") return "danger";
  if (status === "HIGH") return "warn";
  if (status === "NORMAL") return "success";
  return "muted";
}

export function FarmerRatingPanel({ token, onUnauthorized }: FarmerRatingPanelProps) {
  const [farmers, setFarmers] = useState<FarmerSummary[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [status, setStatus] = useState("Memuat poin petani");

  async function loadFarmers() {
    try {
      const response = await fetch(`${API_URL}/api/rating/farmers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if ([401, 403].includes(response.status)) {
        onUnauthorized();
        throw new Error("Login admin diperlukan");
      }
      if (!response.ok) {
        throw new Error(await apiError(response, "Gagal memuat poin petani"));
      }

      const payload = (await response.json()) as FarmerSummary[];
      setFarmers(payload);
      setSelectedFarmerId((current) => current || payload[0]?.id || "");
      setStatus(payload.length > 0 ? `${payload.length} petani terverifikasi` : "Belum ada petani");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memuat petani");
    }
  }

  useEffect(() => {
    void loadFarmers();
  }, [token]);

  const selectedFarmer = farmers.find((farmer) => farmer.id === selectedFarmerId);
  const monthLabel = selectedFarmer?.monthLabel ?? farmers[0]?.monthLabel ?? "bulan ini";
  const totalReports = farmers.reduce((total, farmer) => total + farmer.reportCount, 0);
  const totalPoints = farmers.reduce((total, farmer) => total + farmer.pointTotal, 0);
  const voucherCount = farmers.filter((farmer) => farmer.voucherEligible).length;

  return (
    <section className="panel rating-panel" id="rating-petani">
      <div className="panel-title">
        <h3>Poin kinerja petani</h3>
        <span>{status}</span>
      </div>

      <button className="refresh-button" type="button" onClick={loadFarmers}>
        <RefreshCw size={16} />
        Muat ulang
      </button>

      <div className="performance-overview">
        <article>
          <TrendingUp size={18} />
          <span>{totalReports.toLocaleString("id-ID")}</span>
          <p>Laporan {monthLabel}</p>
        </article>
        <article>
          <Star size={18} />
          <span>{totalPoints.toLocaleString("id-ID")}</span>
          <p>Total poin</p>
        </article>
        <article>
          <Gift size={18} />
          <span>{voucherCount.toLocaleString("id-ID")}</span>
          <p>Voucher otomatis</p>
        </article>
      </div>

      <div className="rating-form">
        <label className="wide">
          Petani
          <select
            value={selectedFarmerId}
            onChange={(event) => setSelectedFarmerId(event.target.value)}
          >
            {farmers.length === 0 ? <option value="">Belum ada petani</option> : null}
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>
                {farmer.name} - {farmer.reportCount} laporan - {farmer.pointTotal} poin
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedFarmer ? (
        <>
          <article className="rating-summary">
            <span>
              <Star size={17} />
              {selectedFarmer.pointTotal} poin
            </span>
            <div>
              <strong>{selectedFarmer.name}</strong>
              <p>
                {selectedFarmer.contact} - {selectedFarmer.reportCount} laporan {monthLabel}
              </p>
              <p>
                High {selectedFarmer.statusCounts.high} - Normal {selectedFarmer.statusCounts.normal} -
                Rendah/anomali {selectedFarmer.statusCounts.low + selectedFarmer.statusCounts.insufficientData}
              </p>
            </div>
          </article>

          <div className="voucher-status">
            <Gift size={18} />
            <div>
              <strong>
                {selectedFarmer.voucherEligible ? "Voucher dikonfirmasi otomatis" : "Poin belum mencapai voucher"}
              </strong>
              <p>
                {selectedFarmer.latestRating?.benefitTitle
                  ? `${selectedFarmer.latestRating.benefitTitle} ${formatCurrency(
                      selectedFarmer.latestRating.benefitValue
                    )}`
                  : `Ambang voucher ${selectedFarmer.voucherThreshold} poin`}
              </p>
            </div>
          </div>

          <div className="report-dashboard">
            <section>
              <div className="subsection-title">
                <CalendarDays size={17} />
                <h4>Frekuensi harian</h4>
              </div>
              <div className="daily-report-list">
                {selectedFarmer.dailyReports.length === 0 ? (
                  <p className="empty-state">Belum ada laporan pada {monthLabel}.</p>
                ) : (
                  selectedFarmer.dailyReports.map((day) => (
                    <article key={day.date}>
                      <strong>{day.dayName}</strong>
                      <span>{day.reportCount} laporan</span>
                      <p>
                        {day.points} poin - High {day.highCount}, Normal {day.normalCount}, Rendah{" "}
                        {day.lowCount + day.insufficientDataCount}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="subsection-title">
                <AlertTriangle size={17} />
                <h4>Laporan bulan ini</h4>
              </div>
              <div className="monthly-report-list">
                {selectedFarmer.monthlyReports?.length ? (
                  selectedFarmer.monthlyReports.map((report) => (
                    <article key={report.id}>
                      <div>
                        <strong>{report.commodity}</strong>
                        <p>
                          {report.district} - Rp{report.pricePerKg.toLocaleString("id-ID")}/kg -{" "}
                          {new Date(report.createdAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <span className={statusClass(report.status)}>
                        {statusLabel(report.status)} - {report.points} poin
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">Belum ada laporan harga bulan ini.</p>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
