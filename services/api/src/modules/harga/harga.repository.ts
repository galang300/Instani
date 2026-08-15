import type {
  AnomalyResult,
  HeatmapPoint,
  PriceReport,
  PriceStatus,
  ReferencePrice
} from "@panganterkini/shared-types";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import csv from "csv-parser";
import { detectIqr, detectMad, detectZScore } from "../../common/anomaly.js";
import { env } from "../../common/config.js";
import { prisma } from "../../database/prisma.js";

const now = () => new Date().toISOString();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_REFERENCE_PATH = path.resolve(
  __dirname,
  "../../../data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv"
);

type PihpsScraperItem = {
  commodity?: string;
  pricePerKg?: number;
  province?: string;
  regency?: string;
  sampledAt?: string;
};

type PihpsScraperResponse = {
  sampledAt?: string;
  items?: PihpsScraperItem[];
};

type PriceReportInput = Omit<PriceReport, "id" | "createdAt" | "zScore" | "status">;
type ReferencePriceFilters = { province?: string; regency?: string; commodity?: string };
type ReferenceLookupOptions = { province?: string; regency?: string };
type CsvReferenceRow = Record<string, string | undefined>;

const REFERENCE_LOW_RATIO = 0.85;
const REFERENCE_HIGH_RATIO = 1.15;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const AUTO_VOUCHER_POINT_THRESHOLD = 80;
const AUTO_VOUCHER_VALUE = 50_000;
let csvReferencePricesPromise: Promise<ReferencePrice[]> | null = null;

export type ReportPeriod = "today" | "month" | "all";

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

export type FarmerMonthlyReport = PriceReport & {
  reporterId?: string;
  date: string;
  dayName: string;
  points: number;
};

export type FarmerPerformanceReward = {
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

export type FarmerPerformanceSummary = {
  averageScore: number | null;
  ratingCount: number;
  reportCount: number;
  pointTotal: number;
  voucherEligible: boolean;
  voucherThreshold: number;
  performanceLabel: string;
  latestRating?: FarmerPerformanceReward;
  rewards: FarmerPerformanceReward[];
  history: FarmerPerformanceReward[];
  dailyReports: FarmerDailyReportSummary[];
  monthlyReports?: FarmerMonthlyReport[];
  statusCounts: {
    low: number;
    normal: number;
    high: number;
    insufficientData: number;
  };
  monthLabel: string;
};

export type FarmerReportingDashboard = {
  monthLabel: string;
  generatedAt: string;
  voucherThreshold: number;
  dailyReports: FarmerDailyReportSummary[];
  farmers: Array<
    {
      id: string;
      name: string;
      username?: string;
      contact: string;
      monthlyReportCount: number;
      monthlyPointTotal: number;
      latestReportAt?: string;
    } & FarmerPerformanceSummary
  >;
  reports: FarmerMonthlyReport[];
};

function jakartaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  };
}

function startOfJakartaDay(date = new Date()) {
  const parts = jakartaParts(date);
  return new Date(Date.UTC(parts.year, parts.month, parts.day) - JAKARTA_OFFSET_MS);
}

function startOfJakartaMonth(date = new Date()) {
  const parts = jakartaParts(date);
  return new Date(Date.UTC(parts.year, parts.month, 1) - JAKARTA_OFFSET_MS);
}

function startOfNextJakartaMonth(date = new Date()) {
  const parts = jakartaParts(date);
  return new Date(Date.UTC(parts.year, parts.month + 1, 1) - JAKARTA_OFFSET_MS);
}

function dateRangeForPeriod(period: ReportPeriod = "today") {
  if (period === "all") return undefined;

  if (period === "month") {
    return {
      gte: startOfJakartaMonth(),
      lt: startOfNextJakartaMonth()
    };
  }

  return {
    gte: startOfJakartaDay(),
    lt: new Date(startOfJakartaDay().getTime() + 24 * 60 * 60 * 1000)
  };
}

function jakartaDateKey(date: Date) {
  const parts = jakartaParts(date);
  return [
    parts.year,
    String(parts.month + 1).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("-");
}

const dayNameFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  timeZone: "Asia/Jakarta"
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta"
});

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function jakartaDayName(date: Date) {
  return titleCase(dayNameFormatter.format(date));
}

function currentJakartaMonthLabel() {
  return titleCase(monthFormatter.format(new Date()));
}

export function performancePointsForStatus(status: PriceStatus) {
  if (status === "HIGH") return 10;
  if (status === "NORMAL") return 8;
  return 0;
}

function performanceLabelFromPoints(points: number, reportCount: number) {
  if (points >= AUTO_VOUCHER_POINT_THRESHOLD) return "Voucher otomatis";
  if (reportCount >= 5) return "Aktif melapor";
  if (reportCount > 0) return "Mulai melapor";
  return "Belum ada laporan";
}

function reporterContact(farmer: {
  username?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return farmer.phone ?? farmer.email ?? farmer.username ?? "-";
}

function toPriceReport(record: {
  id: string;
  commodity: string;
  pricePerKg: number;
  volumeKg: number;
  district: string;
  village: string | null;
  source: "WEB" | "WHATSAPP" | "MOBILE" | "SCRAPER" | "ADMIN";
  latitude: unknown;
  longitude: unknown;
  zScore: number | null;
  status: "LOW" | "NORMAL" | "HIGH" | "INSUFFICIENT_DATA";
  reporter?: {
    name: string;
    phone: string | null;
    email?: string | null;
  } | null;
  createdAt: Date;
}): PriceReport {
  return {
    id: record.id,
    commodity: record.commodity,
    pricePerKg: record.pricePerKg,
    volumeKg: record.volumeKg,
    district: record.district,
    village: record.village ?? undefined,
    source: record.source,
    createdAt: record.createdAt.toISOString(),
    location: {
      lat: Number(record.latitude),
      lng: Number(record.longitude)
    },
    zScore: record.zScore ?? undefined,
    status: record.status,
    reporterName: record.reporter?.name,
    reporterPhone: record.reporter?.phone ?? record.reporter?.email ?? undefined
  };
}

function toMonthlyReport(record: {
  id: string;
  commodity: string;
  pricePerKg: number;
  volumeKg: number;
  district: string;
  village: string | null;
  source: "WEB" | "WHATSAPP" | "MOBILE" | "SCRAPER" | "ADMIN";
  latitude: unknown;
  longitude: unknown;
  zScore: number | null;
  status: PriceStatus;
  reporterId: string | null;
  reporter?: {
    name: string;
    phone: string | null;
    email?: string | null;
  } | null;
  createdAt: Date;
}): FarmerMonthlyReport {
  return {
    ...toPriceReport(record),
    reporterId: record.reporterId ?? undefined,
    date: jakartaDateKey(record.createdAt),
    dayName: jakartaDayName(record.createdAt),
    points: performancePointsForStatus(record.status)
  };
}

function emptyStatusCounts() {
  return {
    low: 0,
    normal: 0,
    high: 0,
    insufficientData: 0
  };
}

function addStatusCount(
  counts: ReturnType<typeof emptyStatusCounts>,
  status: PriceStatus | undefined
) {
  if (status === "LOW") counts.low += 1;
  if (status === "NORMAL") counts.normal += 1;
  if (status === "HIGH") counts.high += 1;
  if (!status || status === "INSUFFICIENT_DATA") counts.insufficientData += 1;
}

function summarizeReportsByDay(reports: FarmerMonthlyReport[]): FarmerDailyReportSummary[] {
  const summaries = new Map<string, FarmerDailyReportSummary>();

  for (const report of reports) {
    const current =
      summaries.get(report.date) ?? {
        date: report.date,
        dayName: report.dayName,
        reportCount: 0,
        points: 0,
        lowCount: 0,
        normalCount: 0,
        highCount: 0,
        insufficientDataCount: 0
      };

    current.reportCount += 1;
    current.points += report.points;
    if (report.status === "LOW") current.lowCount += 1;
    if (report.status === "NORMAL") current.normalCount += 1;
    if (report.status === "HIGH") current.highCount += 1;
    if (!report.status || report.status === "INSUFFICIENT_DATA") {
      current.insufficientDataCount += 1;
    }

    summaries.set(report.date, current);
  }

  return Array.from(summaries.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function autoVoucherReward(input: {
  farmerId: string;
  pointTotal: number;
  reportCount: number;
  monthLabel: string;
}): FarmerPerformanceReward | undefined {
  if (input.pointTotal < AUTO_VOUCHER_POINT_THRESHOLD) return undefined;

  return {
    id: `auto-voucher-${input.farmerId}-${input.monthLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    farmerId: input.farmerId,
    adminName: "Admin otomatis",
    score: input.pointTotal,
    performanceLabel: "Voucher dikonfirmasi",
    note: `${input.reportCount} laporan harga bulan ${input.monthLabel}`,
    benefitTitle: "Voucher apresiasi laporan harga",
    benefitDescription: `Dikonfirmasi otomatis karena poin laporan bulan ${input.monthLabel} mencapai ${input.pointTotal}.`,
    benefitValue: AUTO_VOUCHER_VALUE,
    benefitStatus: "CONFIRMED",
    createdAt: now()
  };
}

function buildFarmerPerformanceSummary(input: {
  farmerId: string;
  reports: FarmerMonthlyReport[];
  monthLabel: string;
  includeMonthlyReports?: boolean;
}): FarmerPerformanceSummary {
  const pointTotal = input.reports.reduce((total, report) => total + report.points, 0);
  const reportCount = input.reports.length;
  const voucher = autoVoucherReward({
    farmerId: input.farmerId,
    pointTotal,
    reportCount,
    monthLabel: input.monthLabel
  });
  const statusCounts = emptyStatusCounts();

  for (const report of input.reports) {
    addStatusCount(statusCounts, report.status);
  }

  const summary: FarmerPerformanceSummary = {
    averageScore: reportCount > 0 ? pointTotal : null,
    ratingCount: reportCount,
    reportCount,
    pointTotal,
    voucherEligible: Boolean(voucher),
    voucherThreshold: AUTO_VOUCHER_POINT_THRESHOLD,
    performanceLabel: performanceLabelFromPoints(pointTotal, reportCount),
    latestRating: voucher,
    rewards: voucher ? [voucher] : [],
    history: voucher ? [voucher] : [],
    dailyReports: summarizeReportsByDay(input.reports),
    statusCounts,
    monthLabel: input.monthLabel
  };

  if (input.includeMonthlyReports) {
    summary.monthlyReports = input.reports;
  }

  return summary;
}

async function peerPricesForCommodity(commodity: string, excludeId?: string) {
  try {
    const storedReports = await prisma.priceReport.findMany({
      where: {
        commodity: { equals: commodity.trim(), mode: "insensitive" },
        id: excludeId ? { not: excludeId } : undefined
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { pricePerKg: true }
    });

    return storedReports.map((report: { pricePerKg: number }) => report.pricePerKg);
  } catch {
    return [];
  }
}

function normalizeCommodityName(commodity: string) {
  return commodity.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parsePriceNumber(value?: string) {
  if (!value) return NaN;

  let normalized = value.trim().replace(/[^\d.,-]/g, "");
  if (!normalized) return NaN;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized
      .replace(new RegExp(`\\${groupSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized =
      decimals === 3
        ? normalized.replace(/,/g, "")
        : normalized.replace(",", ".");
  } else if (lastDot >= 0) {
    const decimals = normalized.length - lastDot - 1;
    normalized =
      decimals === 3
        ? normalized.replace(/\./g, "")
        : normalized;
  }

  return Math.round(Number(normalized));
}

function csvReferenceId(input: {
  commodity: string;
  province: string;
  regency: string;
}) {
  return `csv-${[input.commodity, input.province, input.regency]
    .map((value) => normalizeCommodityName(value).replace(/\s+/g, "-"))
    .join("-")}`;
}

function matchesReferenceFilters(item: ReferencePrice, options?: ReferencePriceFilters) {
  if (
    options?.province &&
    !item.province.toLowerCase().includes(options.province.toLowerCase())
  ) {
    return false;
  }

  if (
    options?.regency &&
    !item.regency.toLowerCase().includes(options.regency.toLowerCase())
  ) {
    return false;
  }

  if (
    options?.commodity &&
    !item.commodity.toLowerCase().includes(options.commodity.toLowerCase())
  ) {
    return false;
  }

  return true;
}

async function readCsvReferencePrices() {
  if (csvReferencePricesPromise) {
    return csvReferencePricesPromise;
  }

  csvReferencePricesPromise = new Promise<ReferencePrice[]>((resolve) => {
    if (!existsSync(CSV_REFERENCE_PATH)) {
      resolve([]);
      return;
    }

    const latestByKey = new Map<string, ReferencePrice>();

    createReadStream(CSV_REFERENCE_PATH)
      .pipe(csv())
      .on("data", (row: CsvReferenceRow) => {
        const commodity = row["Komoditas"]?.trim();
        const province = row["Provinsi"]?.trim();
        const regency = row["Kabupaten/Kota"]?.trim();
        const sampledAtRaw = row["Tanggal"]?.trim();
        const pricePerKg = parsePriceNumber(row["Harga (Rp)"]);

        if (!commodity || !province || !regency || !sampledAtRaw || !Number.isFinite(pricePerKg)) {
          return;
        }

        const sampledAt = normalizeSampledAt(sampledAtRaw);
        if (Number.isNaN(sampledAt.getTime())) {
          return;
        }

        const key = [commodity, province, regency].map(normalizeCommodityName).join("|");
        const sampledAtIso = sampledAt.toISOString();
        const existing = latestByKey.get(key);

        if (existing && existing.sampledAt >= sampledAtIso) {
          return;
        }

        latestByKey.set(key, {
          id: csvReferenceId({ commodity, province, regency }),
          commodity,
          pricePerKg,
          source: "PIHPS",
          province,
          regency,
          sampledAt: sampledAtIso
        });
      })
      .on("end", () => resolve(Array.from(latestByKey.values())))
      .on("error", () => resolve([]));
  });

  return csvReferencePricesPromise;
}

async function csvReferencePrices(options?: ReferencePriceFilters) {
  const prices = await readCsvReferencePrices();
  return prices
    .filter((item) => matchesReferenceFilters(item, options))
    .sort((a, b) =>
      a.commodity.localeCompare(b.commodity, "id-ID") ||
      a.province.localeCompare(b.province, "id-ID") ||
      a.regency.localeCompare(b.regency, "id-ID")
    )
    .slice(0, 500);
}

function findReferenceCandidate(prices: ReferencePrice[], commodity: string) {
  const normalizedCommodity = normalizeCommodityName(commodity);

  return prices.find(
    (candidate) =>
      normalizeCommodityName(candidate.commodity) === normalizedCommodity
  ) ?? prices.find((candidate) => {
    const normalizedCandidate = normalizeCommodityName(candidate.commodity);
    return (
      normalizedCandidate.includes(normalizedCommodity) ||
      normalizedCommodity.includes(normalizedCandidate)
    );
  });
}

function referenceLocationFilter(options?: ReferenceLookupOptions) {
  return {
    ...(options?.province
      ? { province: { equals: options.province, mode: "insensitive" as const } }
      : {}),
    ...(options?.regency
      ? { regency: { contains: options.regency, mode: "insensitive" as const } }
      : {})
  };
}

function hasReferenceLocation(options?: ReferenceLookupOptions) {
  return Boolean(options?.province || options?.regency);
}

async function latestReferenceForCommodity(
  commodity: string,
  options?: ReferenceLookupOptions
) {
  const normalizedCommodity = normalizeCommodityName(commodity);
  const locationFilter = referenceLocationFilter(options);

  try {
    const exactReference = await prisma.priceReference.findFirst({
      where: {
        source: { in: ["PIHPS", "BAPANAS"] },
        commodity: { equals: commodity.trim(), mode: "insensitive" },
        ...locationFilter
      },
      orderBy: { sampledAt: "desc" },
      select: {
        commodity: true,
        pricePerKg: true
      }
    });

    if (exactReference) return exactReference;

    const candidates = await prisma.priceReference.findMany({
      where: {
        source: { in: ["PIHPS", "BAPANAS"] },
        ...locationFilter
      },
      orderBy: { sampledAt: "desc" },
      take: 80,
      select: {
        commodity: true,
        pricePerKg: true
      }
    });

    const storedCandidate = candidates.find((candidate) => {
      const normalizedCandidate = normalizeCommodityName(candidate.commodity);
      return (
        normalizedCandidate.includes(normalizedCommodity) ||
        normalizedCommodity.includes(normalizedCandidate)
      );
    });

    if (storedCandidate) return storedCandidate;
  } catch {
    // Lanjut ke CSV/scraper ketika DB belum tersedia.
  }

  const csvCandidate = findReferenceCandidate(
    await csvReferencePrices(options),
    commodity
  );

  if (csvCandidate) {
    return {
      commodity: csvCandidate.commodity,
      pricePerKg: csvCandidate.pricePerKg
    };
  }

  const liveReferences = await fetchPihpsReferencePrices();
  const liveCandidate = findReferenceCandidate(
    liveReferences.filter((item) => matchesReferenceFilters(item, options)),
    commodity
  );

  if (!liveCandidate && hasReferenceLocation(options)) {
    return latestReferenceForCommodity(commodity);
  }

  return liveCandidate
    ? {
        commodity: liveCandidate.commodity,
        pricePerKg: liveCandidate.pricePerKg
      }
    : undefined;
}

async function referenceStatusForCommodity(
  input: PriceReportInput,
  options?: ReferenceLookupOptions
) {
  const reference = await latestReferenceForCommodity(input.commodity, options);
  if (!reference || reference.pricePerKg <= 0) {
    return null;
  }

  const ratio = input.pricePerKg / reference.pricePerKg;
  const status: PriceStatus =
    ratio < REFERENCE_LOW_RATIO ? "LOW" : ratio > REFERENCE_HIGH_RATIO ? "HIGH" : "NORMAL";

  return {
    status,
    referencePrice: reference.pricePerKg,
    referenceCommodity: reference.commodity,
    referenceScore: (ratio - 1) / 0.1
  };
}

async function enrichReportInput(
  input: PriceReportInput,
  excludeReportId?: string,
  referenceOptions?: ReferenceLookupOptions
) {
  const peerPrices = await peerPricesForCommodity(
    input.commodity,
    excludeReportId
  );

  const zScoreResult = detectZScore(
    peerPrices,
    input.pricePerKg
  );

  const iqrStatus = detectIqr(
    peerPrices,
    input.pricePerKg
  );

  const madStatus = detectMad(
    peerPrices,
    input.pricePerKg
  );

  const referenceStatus =
    await referenceStatusForCommodity(input, referenceOptions);

  const statisticalStatuses = [
    zScoreResult.status,
    iqrStatus,
    madStatus
  ].filter(
    (
      status
    ): status is "LOW" | "NORMAL" | "HIGH" =>
      status === "LOW" ||
      status === "NORMAL" ||
      status === "HIGH"
  );

  const lowVotes = statisticalStatuses.filter(
    (status) => status === "LOW"
  ).length;

  const highVotes = statisticalStatuses.filter(
    (status) => status === "HIGH"
  ).length;

  let status: PriceStatus = "NORMAL";

  /*
   * PRIORITAS 1:
   * Jika minimal 2 detector statistik sepakat,
   * langsung anggap anomaly.
   */
  if (highVotes >= 2) {
    status = "HIGH";
  } else if (lowVotes >= 2) {
    status = "LOW";
  }

  /*
   * PRIORITAS 2:
   * Jika hanya 1 detector mendeteksi anomaly,
   * tetapi PIHPS juga mendukung anomaly tersebut,
   * maka tetap anomaly.
   */
  else if (
    highVotes >= 1 &&
    referenceStatus?.status === "HIGH"
  ) {
    status = "HIGH";
  } else if (
    lowVotes >= 1 &&
    referenceStatus?.status === "LOW"
  ) {
    status = "LOW";
  }

  /*
   * PRIORITAS 3:
   * Jika data statistik belum cukup,
   * gunakan PIHPS sebagai fallback.
   */
  else if (
    zScoreResult.status === "INSUFFICIENT_DATA"
  ) {
    status =
      referenceStatus?.status ??
      "INSUFFICIENT_DATA";
  }

  /*
   * PRIORITAS 4:
   * Jika tidak ada anomaly statistik,
   * tetapi PIHPS mendeteksi perbedaan signifikan,
   * gunakan PIHPS.
   */
  else if (
    referenceStatus &&
    referenceStatus.status !== "NORMAL"
  ) {
    status = referenceStatus.status;
  }

  /*
   * Z-score tetap disimpan untuk kebutuhan frontend,
   * dashboard, dan heatmap.
   */
  const rawZScore =
    zScoreResult.status === "INSUFFICIENT_DATA" &&
    referenceStatus
      ? referenceStatus.referenceScore
      : zScoreResult.zScore;

  const zScore =
    rawZScore !== null &&
    rawZScore !== undefined &&
    !Number.isNaN(rawZScore)
      ? Number(rawZScore.toFixed(2))
      : null;

  return {
    zScore,
    status
  };
}

type StoredReportForReclassification = {
  id: string;
  commodity: string;
  pricePerKg: number;
  volumeKg: number;
  district: string;
  village: string | null;
  source: "WEB" | "WHATSAPP" | "MOBILE" | "SCRAPER" | "ADMIN";
  latitude: unknown;
  longitude: unknown;
  zScore: number | null;
  status: PriceStatus;
};

async function reclassifyStoredReport<T extends StoredReportForReclassification>(
  record: T
): Promise<T & { zScore: number | null; status: PriceStatus }> {
  if (record.status !== "INSUFFICIENT_DATA") {
    return record;
  }

  const enriched = await enrichReportInput(
    {
      commodity: record.commodity,
      pricePerKg: record.pricePerKg,
      volumeKg: record.volumeKg,
      district: record.district,
      village: record.village ?? undefined,
      source: record.source,
      location: {
        lat: Number(record.latitude),
        lng: Number(record.longitude)
      }
    },
    record.id
  );

  if (enriched.status === "INSUFFICIENT_DATA") {
    return record;
  }

  await prisma.priceReport.update({
    where: { id: record.id },
    data: {
      status: enriched.status,
      zScore: enriched.zScore
    }
  });

  return {
    ...record,
    status: enriched.status,
    zScore: enriched.zScore
  };
}

async function reclassifyRecentInsufficientReports() {
  const reports = await prisma.priceReport.findMany({
    where: { status: "INSUFFICIENT_DATA" },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  await Promise.all(reports.map(reclassifyStoredReport));
}

export type ReferenceSyncResult = {
  source: "PIHPS";
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  saved: number;
  latestSampledAt?: string;
};

export type HargaDashboardStats = {
  sampleToday: number;
  lowPriceCount: number;
  averagePrice: number;
  notificationCount: number;
  averageSource: "REPORTS_TODAY" | "PIHPS_REFERENCE" | "NONE";
};

function normalizeSampledAt(sampledAt: string) {
  return sampledAt.length === 10 ? new Date(`${sampledAt}T00:00:00.000Z`) : new Date(sampledAt);
}

function toReferencePrice(record: {
  id: string;
  commodity: string;
  pricePerKg: number;
  source: string;
  province: string;
  regency: string;
  sampledAt: Date;
}): ReferencePrice {
  return {
    id: record.id,
    commodity: record.commodity,
    pricePerKg: record.pricePerKg,
    source: record.source === "PIHPS" || record.source === "BAPANAS" ? record.source : "LOCAL_AVERAGE",
    province: record.province,
    regency: record.regency,
    sampledAt: record.sampledAt.toISOString()
  };
}

async function fetchPihpsReferencePrices(options?: { force?: boolean }): Promise<ReferencePrice[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = new URL("/scrape/pihps", env.scraperUrl);
    if (options?.force) {
      url.searchParams.set("force", "true");
    }

    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PihpsScraperResponse;
    const sampledAt = payload.sampledAt ?? now();

    return (payload.items ?? [])
      .filter((item) => item.commodity && Number.isFinite(item.pricePerKg))
      .map((item, index) => ({
        id: `pihps-${index + 1}-${String(item.commodity).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        commodity: String(item.commodity),
        pricePerKg: Number(item.pricePerKg),
        source: "PIHPS",
        province: item.province ?? "",
        regency: item.regency ?? "",
        sampledAt: item.sampledAt ?? sampledAt
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function persistedReferencePrices(options?: {
  province?: string;
  regency?: string;
  commodity?: string;
  limit?: number;
}): Promise<ReferencePrice[]> {
  const where: Record<string, unknown> = {
    source: { in: ["PIHPS", "BAPANAS"] }
  };

  if (options?.province) {
    where.province = { equals: options.province, mode: "insensitive" };
  }
  if (options?.regency) {
    where.regency = { equals: options.regency, mode: "insensitive" };
  }
  if (options?.commodity) {
    where.commodity = { equals: options.commodity, mode: "insensitive" };
  }

  const records = await prisma.priceReference.findMany({
    where,
    orderBy: [{ commodity: "asc" }, { province: "asc" }, { regency: "asc" }, { sampledAt: "desc" }],
    distinct: ["commodity", "province", "regency"],
    take: options?.limit ?? 500
  });

  return records.map(toReferencePrice);
}

async function persistedReferenceFilters(options?: { province?: string }) {
  const sourceFilter = { source: { in: ["PIHPS", "BAPANAS"] } };

  const [provinces, regencies, commodities] = await Promise.all([
    prisma.priceReference.findMany({
      where: sourceFilter,
      distinct: ["province"],
      select: { province: true },
      orderBy: { province: "asc" }
    }),
    prisma.priceReference.findMany({
      where: {
        ...sourceFilter,
        ...(options?.province
          ? { province: { equals: options.province, mode: "insensitive" as const } }
          : {})
      },
      distinct: ["regency"],
      select: { regency: true },
      orderBy: { regency: "asc" }
    }),
    prisma.priceReference.findMany({
      where: sourceFilter,
      distinct: ["commodity"],
      select: { commodity: true },
      orderBy: { commodity: "asc" }
    })
  ]);

  return {
    provinces: provinces.map((item) => item.province).filter(Boolean),
    regencies: regencies.map((item) => item.regency).filter(Boolean),
    commodities: commodities.map((item) => item.commodity).filter(Boolean)
  };
}

async function syncPihpsReferencePrices(): Promise<ReferenceSyncResult> {
  const livePrices = await fetchPihpsReferencePrices({ force: true });
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let latestSampledAt: string | undefined;

  for (const item of livePrices) {
    if (!item.commodity || !Number.isFinite(item.pricePerKg) || !item.sampledAt) {
      skipped += 1;
      continue;
    }

    const sampledAt = normalizeSampledAt(item.sampledAt);
    if (Number.isNaN(sampledAt.getTime())) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.priceReference.findFirst({
      where: {
        commodity: item.commodity,
        source: item.source,
        province: item.province,
        regency: item.regency,
        sampledAt
      }
    });

    if (existing) {
      await prisma.priceReference.update({
        where: { id: existing.id },
        data: { pricePerKg: item.pricePerKg }
      });
      updated += 1;
    } else {
      await prisma.priceReference.create({
        data: {
          commodity: item.commodity,
          pricePerKg: item.pricePerKg,
          source: item.source,
          province: item.province,
          regency: item.regency,
          sampledAt
        }
      });
      created += 1;
    }

    const sampledAtIso = sampledAt.toISOString();
    if (!latestSampledAt || sampledAtIso > latestSampledAt) {
      latestSampledAt = sampledAtIso;
    }
  }

  return {
    source: "PIHPS",
    fetched: livePrices.length,
    created,
    updated,
    skipped,
    saved: created + updated,
    latestSampledAt
  };
}

export const hargaRepository = {
  async listReports(filters?: { commodity?: string; district?: string; period?: ReportPeriod }) {
    const dateRange = dateRangeForPeriod(filters?.period ?? "today");
    const storedReports = await prisma.priceReport.findMany({
      where: {
        commodity: filters?.commodity
          ? { contains: filters.commodity, mode: "insensitive" }
          : undefined,
        district: filters?.district ? { contains: filters.district, mode: "insensitive" } : undefined,
        createdAt: dateRange
      },
      orderBy: { createdAt: "desc" },
      take: filters?.period === "month" || filters?.period === "all" ? undefined : 100,
      include: {
        reporter: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    const reports = await Promise.all(storedReports.map(reclassifyStoredReport));
    return reports.map(toPriceReport);
  },

  async monthlyReportingDashboard(): Promise<FarmerReportingDashboard> {
    const monthLabel = currentJakartaMonthLabel();
    const [farmers, storedReports] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "PETANI",
          verificationStatus: "KTP_VERIFIED"
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          email: true
        }
      }),
      prisma.priceReport.findMany({
        where: {
          createdAt: dateRangeForPeriod("month"),
          reporterId: { not: null }
        },
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              name: true,
              phone: true,
              email: true
            }
          }
        }
      })
    ]);

    const reclassifiedReports = await Promise.all(storedReports.map(reclassifyStoredReport));
    const monthlyReports = reclassifiedReports.map(toMonthlyReport);
    const reportsByFarmer = new Map<string, FarmerMonthlyReport[]>();

    for (const report of monthlyReports) {
      if (!report.reporterId) continue;
      reportsByFarmer.set(report.reporterId, [
        ...(reportsByFarmer.get(report.reporterId) ?? []),
        report
      ]);
    }

    const farmerSummaries = farmers.map((farmer) => {
      const reports = reportsByFarmer.get(farmer.id) ?? [];
      const summary = buildFarmerPerformanceSummary({
        farmerId: farmer.id,
        reports,
        monthLabel,
        includeMonthlyReports: true
      });

      return {
        id: farmer.id,
        name: farmer.name,
        username: farmer.username ?? undefined,
        contact: reporterContact(farmer),
        monthlyReportCount: summary.reportCount,
        monthlyPointTotal: summary.pointTotal,
        latestReportAt: reports[0]?.createdAt,
        ...summary
      };
    });

    return {
      monthLabel,
      generatedAt: now(),
      voucherThreshold: AUTO_VOUCHER_POINT_THRESHOLD,
      dailyReports: summarizeReportsByDay(monthlyReports),
      farmers: farmerSummaries,
      reports: monthlyReports
    };
  },

  async farmerPerformanceForUser(farmerId: string): Promise<FarmerPerformanceSummary> {
    const monthLabel = currentJakartaMonthLabel();
    const storedReports = await prisma.priceReport.findMany({
      where: {
        reporterId: farmerId,
        createdAt: dateRangeForPeriod("month")
      },
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });
    const reclassifiedReports = await Promise.all(storedReports.map(reclassifyStoredReport));

    return buildFarmerPerformanceSummary({
      farmerId,
      reports: reclassifiedReports.map(toMonthlyReport),
      monthLabel
    });
  },

  async createReport(
    input: PriceReportInput,
    options?: {
      reporterId?: string;
      referenceProvince?: string;
      referenceRegency?: string;
    }
  ) {
    const enriched = await enrichReportInput(input, undefined, {
      province: options?.referenceProvince,
      regency: options?.referenceRegency
    });
    const report = await prisma.priceReport.create({
      data: {
        commodity: input.commodity,
        pricePerKg: input.pricePerKg,
        volumeKg: input.volumeKg,
        district: input.district,
        village: input.village,
        source: input.source,
        latitude: input.location.lat,
        longitude: input.location.lng,
        zScore: enriched.zScore,
        status: enriched.status,
        reporterId: options?.reporterId
      },
      include: {
        reporter: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    return toPriceReport(report);
  },

  async referencePrices(options?: { province?: string; regency?: string; commodity?: string }) {
    try {
      const storedPrices = await persistedReferencePrices(options);
      if (storedPrices.length > 0) {
        return storedPrices;
      }
    } catch {
      // Fallback untuk MVP ketika DB belum siap
    }

    const csvPrices = await csvReferencePrices(options);
    if (csvPrices.length > 0) {
      return csvPrices;
    }

    const pihpsLivePrices = await fetchPihpsReferencePrices();
    return pihpsLivePrices.filter((item) =>
      matchesReferenceFilters(item, options)
    );
  },

  syncReferencePrices() {
    return syncPihpsReferencePrices();
  },

  async referencePricesByLocation(options?: { province?: string; regency?: string; commodity?: string }) {
    return this.referencePrices(options);
  },

  async referenceFilters(options?: { province?: string }) {
    try {
      const filters = await persistedReferenceFilters(options);
      if (
        filters.provinces.length > 0 ||
        filters.regencies.length > 0 ||
        filters.commodities.length > 0
      ) {
        return filters;
      }
    } catch {
      // Fallback saat koneksi database belum siap
    }

    const csvPrices = await readCsvReferencePrices();
    const livePrices = csvPrices.length > 0 ? [] : await fetchPihpsReferencePrices();
    const fallbackPrices = csvPrices.length > 0 ? csvPrices : livePrices;
    const scopedPrices = fallbackPrices.filter((item) =>
      options?.province
        ? item.province.toLowerCase() === options.province.toLowerCase()
        : true
    );
    const provinces = Array.from(new Set(fallbackPrices.map((item) => item.province))).sort();
    const regencies = Array.from(
      new Set(scopedPrices.map((item) => item.regency))
    ).sort();
    const commodities = Array.from(new Set(scopedPrices.map((item) => item.commodity))).sort();

    return { provinces, regencies, commodities };
  },

  async anomalyForCommodity(
    commodity: string,
    value?: number
  ): Promise<AnomalyResult> {
    const prices = await peerPricesForCommodity(commodity);
    const latestValue = value ?? prices[0] ?? 0;

    const zScoreResult = detectZScore(
      prices,
      latestValue
    );

    const referenceStatus = await referenceStatusForCommodity({
      commodity,
      pricePerKg: latestValue,
      volumeKg: 0,
      district: "",
      source: "WEB",
      location: { lat: 0, lng: 0 }
    });

    if (
      referenceStatus &&
      (zScoreResult.status === "INSUFFICIENT_DATA" ||
        (zScoreResult.status === "NORMAL" && referenceStatus.status !== "NORMAL"))
    ) {
      return {
        value: latestValue,
        mean: referenceStatus.referencePrice,
        standardDeviation: referenceStatus.referencePrice * 0.1,
        zScore: Number(referenceStatus.referenceScore.toFixed(2)),
        status: referenceStatus.status,
        method: "ZSCORE",
        message:
          referenceStatus.status === "LOW"
            ? `Harga lebih rendah dari referensi ${referenceStatus.referenceCommodity}.`
            : referenceStatus.status === "HIGH"
              ? `Harga lebih tinggi dari referensi ${referenceStatus.referenceCommodity}.`
              : `Harga berada dalam rentang referensi ${referenceStatus.referenceCommodity}.`
      };
    }

    return zScoreResult;
  },

  async heatmap(): Promise<HeatmapPoint[]> {
    const storedReports = await prisma.priceReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        reporter: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });
    const reports = await Promise.all(storedReports.map(reclassifyStoredReport));
    const priceReports = reports.map(toPriceReport);
    const sameCoordinateCount = new Map<string, number>();

    for (const report of priceReports) {
      const coordinateKey = `${report.location.lat.toFixed(5)},${report.location.lng.toFixed(5)}`;
      sameCoordinateCount.set(coordinateKey, (sameCoordinateCount.get(coordinateKey) ?? 0) + 1);
    }

    return priceReports.map((report) => ({
      id: report.id,
      district: report.district,
      commodity: report.commodity,
      pricePerKg: report.pricePerKg,
      status: report.status ?? "INSUFFICIENT_DATA",
      location: report.location,
      sampleSize:
        sameCoordinateCount.get(`${report.location.lat.toFixed(5)},${report.location.lng.toFixed(5)}`) ??
        1,
      createdAt: report.createdAt,
      reporterName: report.reporterName,
      reporterPhone: report.reporterPhone,
      zScore: report.zScore
    }));
  },

  async lowPriceWarnings() {
    const storedReports = await prisma.priceReport.findMany({
      where: { status: "LOW" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        reporter: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    return storedReports.map(toPriceReport);
  },

  async dashboardStats(): Promise<HargaDashboardStats> {
    await reclassifyRecentInsufficientReports();

    const todayRange = dateRangeForPeriod("today");

    const todayReports = await prisma.priceReport.findMany({
      where: { createdAt: todayRange },
      select: { pricePerKg: true, status: true }
    });
    let latestReferences: ReferencePrice[] = [];
    try {
      latestReferences = await persistedReferencePrices();
    } catch {
      latestReferences = [];
    }

    if (latestReferences.length === 0) {
      latestReferences = await csvReferencePrices();
    }

    const referenceAverage =
      latestReferences.length > 0
        ? Math.round(
            latestReferences.reduce(
              (total: number, item: ReferencePrice) => total + item.pricePerKg,
              0
            ) /
              latestReferences.length
          )
        : 0;
    const todayAverage =
      todayReports.length > 0
        ? Math.round(
            todayReports.reduce(
              (total: number, item: { pricePerKg: number }) => total + item.pricePerKg,
              0
            ) / todayReports.length
          )
        : 0;
    const lowPriceCount = await prisma.priceReport.count({ where: { status: "LOW" } });

    return {
      sampleToday: todayReports.length,
      lowPriceCount,
      averagePrice: todayAverage || referenceAverage,
      notificationCount: lowPriceCount,
      averageSource:
        todayAverage > 0 ? "REPORTS_TODAY" : referenceAverage > 0 ? "PIHPS_REFERENCE" : "NONE"
    };
  }
};
