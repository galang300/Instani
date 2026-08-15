/**
 * Extended Harga Repository dengan PIHPS Integration
 */
import { prisma } from "../../database/prisma.js";

type PriceTimeSeriesRow = {
  pricePerKg: number;
  sampledAt: Date;
};

type PriceTimeSeriesPoint = {
  price: number;
  date: Date;
};

/**
 * Ambil harga PIHPS terbaru untuk komoditas tertentu
 */
export async function getLatestPihpsPrice(
  commodity: string,
  options?: { province?: string; regency?: string }
): Promise<number | null> {
  try {
    const where: any = {
      source: "PIHPS",
      commodity: { equals: commodity, mode: "insensitive" }
    };

    if (options?.province) {
      where.province = { equals: options.province, mode: "insensitive" };
    }
    if (options?.regency) {
      where.regency = { equals: options.regency, mode: "insensitive" };
    }

    const reference = await prisma.priceReference.findFirst({
      where,
      orderBy: { sampledAt: "desc" },
      select: { pricePerKg: true }
    });

    return reference?.pricePerKg ?? null;
  } catch (error) {
    console.error("Error fetching PIHPS price:", error);
    return null;
  }
}

/**
 * Buat price report dengan metadata PIHPS
 */
export async function createReportWithPihps(
  input: {
    commodity: string;
    pricePerKg: number;
    volumeKg: number;
    district: string;
    village?: string;
    source: string;
    location: { lat: number; lng: number };
  },
  metadata: {
    reporterId: string;
    pihpsReferencePrice: number | null;
    priceDeviation: number;
    priceStatus: "NORMAL" | "ANOMALY_SUSPECT";
  }
) {
  const normalizedStatus =
    metadata.priceStatus === "ANOMALY_SUSPECT" ? "HIGH" : "NORMAL";

  return await prisma.priceReport.create({
    data: {
      commodity: input.commodity,
      pricePerKg: input.pricePerKg,
      volumeKg: input.volumeKg,
      district: input.district,
      village: input.village,
      source: input.source as any,
      latitude: input.location.lat,
      longitude: input.location.lng,
      status: normalizedStatus as "LOW" | "NORMAL" | "HIGH" | "INSUFFICIENT_DATA",
      reporterId: metadata.reporterId,
      zScore: metadata.priceDeviation
    },
    include: {
      reporter: {
        select: { name: true, phone: true }
      }
    }
  });
}

/**
 * Get 30-day time series data untuk anomaly detection
 */
export async function getPriceTimeSeriesData(
  commodity: string,
  options?: { province?: string; regency?: string }
): Promise<PriceTimeSeriesPoint[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const where: any = {
    source: "PIHPS",
    commodity: { equals: commodity, mode: "insensitive" },
    sampledAt: { gte: thirtyDaysAgo }
  };

  if (options?.province) {
    where.province = { equals: options.province, mode: "insensitive" };
  }
  if (options?.regency) {
    where.regency = { equals: options.regency, mode: "insensitive" };
  }

  const records = await prisma.priceReference.findMany({
    where,
    orderBy: { sampledAt: "asc" },
    select: { pricePerKg: true, sampledAt: true }
  });

  return records.map((r: PriceTimeSeriesRow) => ({
    price: r.pricePerKg,
    date: r.sampledAt
  }));
}

/**
 * Calculate anomaly summary dengan Z-Score & IQR
 */
export async function calculateAnomalySummary(commodity: string) {
  const timeSeries = await getPriceTimeSeriesData(commodity);

  if (timeSeries.length < 3) {
    return {
      commodity,
      dataPoints: timeSeries.length,
      status: "INSUFFICIENT_DATA",
      message: "Data kurang untuk analisis anomali"
    };
  }

  const prices: number[] = timeSeries.map((t: PriceTimeSeriesPoint) => t.price);
  const mean = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Calculate IQR
  const sorted = [...prices].sort((a: number, b: number) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const latest = prices[prices.length - 1];
  const previous = prices[prices.length - 2] ?? prices[0];
  const priceChange = ((latest - previous) / previous) * 100;

  // Detect anomaly
  const zScore = stdDev > 0 ? (latest - mean) / stdDev : 0;
  const isOutlier = Math.abs(zScore) > 2 || latest < q1 - 1.5 * iqr || latest > q3 + 1.5 * iqr;

  return {
    commodity,
    latest: latest,
    mean: Math.round(mean),
    stdDev: Math.round(stdDev),
    min: Math.min(...prices),
    max: Math.max(...prices),
    priceChange: Number(priceChange.toFixed(2)),
    zScore: Number(zScore.toFixed(2)),
    isAnomalous: isOutlier,
    riskLevel: isOutlier ? (Math.abs(priceChange) > 20 ? "CRITICAL" : "WARNING") : "NORMAL",
    dataPoints: prices.length,
    lastUpdated: timeSeries[timeSeries.length - 1]?.date
  };
}
