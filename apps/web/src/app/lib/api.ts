import type {
  HarvestAuction,
  HeatmapPoint,
  HppInput,
  HppResult,
  GroupBuyingOrder,
  MarketTransaction,
  PriceReport,
  ReferencePrice
} from "@panganterkini/shared-types";
import { getStoredPetaniSession, type PetaniSession } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type HargaDashboardStats = {
  sampleToday: number;
  lowPriceCount: number;
  averagePrice: number;
  notificationCount: number;
  averageSource: "REPORTS_TODAY" | "PIHPS_REFERENCE" | "NONE";
};

export type FarmerPerformanceSummary = {
  averageScore: number | null;
  ratingCount: number;
  reportCount: number;
  pointTotal: number;
  voucherEligible: boolean;
  voucherThreshold: number;
  performanceLabel: string;
  latestRating?: FarmerReward;
  rewards: FarmerReward[];
  history: FarmerReward[];
  dailyReports: FarmerDailyReportSummary[];
  statusCounts: {
    low: number;
    normal: number;
    high: number;
    insufficientData: number;
  };
  monthLabel: string;
};

export type FarmerReward = {
  id: string;
  farmerId: string;
  adminName: string;
  score: number;
  performanceLabel: string;
  note?: string;
  benefitTitle?: string;
  benefitDescription?: string;
  benefitValue?: number;
  benefitStatus?: string;
  createdAt: string;
};

export type FarmerDailyReportSummary = {
  date: string;
  dayName: string;
  reportCount: number;
  points: number;
  lowCount: number;
  normalCount: number;
  highCount: number;
  insufficientDataCount: number;
};

async function apiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export type ContactMethod = "PHONE" | "EMAIL";

export type RegisterPetaniPayload = {
  username: string;
  password: string;
  contactMethod: ContactMethod;
  phone?: string;
  email?: string;
};

export async function registerPetani(payload: RegisterPetaniPayload) {
  const response = await fetch(`${API_URL}/api/auth/petani/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal daftar akun"), response.status);
  }

  return (await response.json()) as PetaniSession;
}

export async function loginPetani(payload: { identifier: string; password: string }) {
  const response = await fetch(`${API_URL}/api/auth/petani/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal masuk akun"), response.status);
  }

  return (await response.json()) as PetaniSession;
}

export async function submitFarmerKtpApplication(payload: {
  ktpImageName: string;
  ktpImageDataUrl: string;
}) {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/users/me/farmer-application`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(
      await apiError(response, "Gagal mengajukan verifikasi KTP"),
      response.status
    );
  }

  return (await response.json()) as PetaniSession["user"];
}

export async function getMe() {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/users/me`, {
    cache: "no-store",
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal mengambil akun"), response.status);
  }

  return (await response.json()) as PetaniSession["user"];
}

export async function getMyFarmerPerformance() {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/rating/me/farmer-performance`, {
    cache: "no-store",
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal mengambil rating petani"), response.status);
  }

  return (await response.json()) as FarmerPerformanceSummary;
}

export async function getPriceReports() {
  const response = await fetch(`${API_URL}/api/harga/reports`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil laporan harga");
  }

  return (await response.json()) as PriceReport[];
}

export async function getHargaStats() {
  const response = await fetch(`${API_URL}/api/harga/stats`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil statistik harga");
  }

  return (await response.json()) as HargaDashboardStats;
}

export async function postPriceReport(
  payload: Omit<PriceReport, "id" | "createdAt" | "zScore" | "status">
) {
  const session = getStoredPetaniSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_URL}/api/harga/reports`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal mengirim harga"), response.status);
  }

  return (await response.json()) as PriceReport;
}

export async function calculateHpp(payload: HppInput) {
  const response = await fetch(`${API_URL}/api/hpp/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Gagal menghitung HPP");
  }

  return (await response.json()) as HppResult;
}

export async function getReferencePrices(filters?: {
  province?: string;
  regency?: string;
  commodity?: string;
}) {
  const params = new URLSearchParams();

  if (filters?.province) params.set("province", filters.province);
  if (filters?.regency) params.set("regency", filters.regency);
  if (filters?.commodity) params.set("commodity", filters.commodity);

  const queryString = params.toString();
  const response = await fetch(`${API_URL}/api/harga/reference${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil harga referensi");
  }

  return (await response.json()) as ReferencePrice[];
}

export type ReferencePriceFilters = {
  provinces: string[];
  regencies: string[];
  commodities: string[];
};

export async function getReferencePriceFilters(filters?: { province?: string }) {
  const params = new URLSearchParams();
  if (filters?.province) params.set("province", filters.province);

  const queryString = params.toString();
  const response = await fetch(
    `${API_URL}/api/harga/reference/filters${queryString ? `?${queryString}` : ""}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Gagal mengambil filter harga referensi");
  }

  return (await response.json()) as ReferencePriceFilters;
}

export async function consultAgent(payload: {
  user_question: string;
  province?: string;
  city_regency?: string;
  latitude?: number;
  longitude?: number;
}) {
  const response = await fetch(`${API_URL}/api/agent/consult`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await apiError(response, "Gagal memproses konsultasi RAG"));
  }

  return (await response.json()) as {
    answer: string;
    context?: {
      weather?: unknown;
      prices?: unknown[];
      anomalies?: unknown[];
      recentReports?: unknown[];
      reportSummary?: {
        scope: "LOCATION" | "ALL_REPORTS_FALLBACK";
        totalReports: number;
        todayReports: number;
        anomalyReports: number;
        lowReports: number;
        highReports: number;
        averagePrice: number | null;
      };
      location?: string;
    };
  };
}

export async function getAgentQuickPrompts() {
  const response = await fetch(`${API_URL}/api/agent/quick-prompts`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil quick prompts");
  }

  return (await response.json()) as {
    prompts: Array<{ id: string; label: string; question: string }>;
  };
}

export async function getHargaWithWeather(filters: {
  province?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}) {
  const params = new URLSearchParams();
  if (filters.province) params.set("province", filters.province);
  if (filters.city) params.set("city", filters.city);
  if (filters.latitude !== undefined) params.set("latitude", filters.latitude.toString());
  if (filters.longitude !== undefined) params.set("longitude", filters.longitude.toString());

  const response = await fetch(`${API_URL}/api/harga/with-weather?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data cuaca");
  }

  return (await response.json()) as {
    weather?: {
      temperature: number;
      humidity: number;
      weatherCondition: string;
      windSpeed: number;
      recommendation: string;
      timestamp: string;
      location?: string;
    } | null;
  };
}

export async function getHeatmapPoints() {
  const response = await fetch(`${API_URL}/api/harga/heatmap`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil peta harga");
  }

  return (await response.json()) as HeatmapPoint[];
}

export async function getAuctions() {
  const response = await fetch(`${API_URL}/api/lelang`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal mengambil lelang"), response.status);
  }

  return (await response.json()) as HarvestAuction[];
}

export async function createAuction(payload: {
  commodity: string;
  quantityKg: number;
  floorPrice: number;
  district: string;
}) {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/lelang`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal membuat lelang"), response.status);
  }

  return (await response.json()) as HarvestAuction;
}

export async function createAuctionBid(
  auctionId: string,
  payload: {
    pricePerKg: number;
    quantityKg: number;
  }
) {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/lelang/${auctionId}/bids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal mengirim bid"), response.status);
  }

  return (await response.json()) as HarvestAuction["bids"][number];
}

export async function closeAuction(auctionId: string) {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/lelang/${auctionId}/close`, {
    method: "POST",
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal menutup lelang"), response.status);
  }

  return (await response.json()) as HarvestAuction[];
}

export async function getGroupBuyingOrders() {
  const response = await fetch(`${API_URL}/api/group-buying`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiRequestError(
      await apiError(response, "Gagal mengambil group buying"),
      response.status
    );
  }

  return (await response.json()) as GroupBuyingOrder[];
}

export async function createGroupBuyingOrder(payload: {
  commodity: string;
  targetKg: number;
  pickupPoint: string;
  deadlineDays: number;
}) {
  const response = await fetch(`${API_URL}/api/group-buying`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new ApiRequestError(
      await apiError(response, "Gagal membuat group buying"),
      response.status
    );
  }

  return (await response.json()) as GroupBuyingOrder;
}

export async function commitGroupBuyingOrder(orderId: string, kg: number) {
  const session = getStoredPetaniSession();
  const response = await fetch(`${API_URL}/api/group-buying/${orderId}/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: JSON.stringify({ kg })
  });

  if (!response.ok) {
    throw new ApiRequestError(
      await apiError(response, "Gagal menambah komitmen"),
      response.status
    );
  }

  return (await response.json()) as GroupBuyingOrder;
}

export async function getTransactions() {
  const response = await fetch(`${API_URL}/api/transaksi`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiRequestError(await apiError(response, "Gagal mengambil transaksi"), response.status);
  }

  return (await response.json()) as MarketTransaction[];
}
