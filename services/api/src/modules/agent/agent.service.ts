/**
 * RAG Agent Service - LLM-backed agricultural advisory engine
 * Menggunakan data internal aplikasi: koordinat, cuaca, harga PIHPS, trend pasar, dan laporan petani
 */
import { env } from "../../common/config.js";
import { prisma } from "../../database/prisma.js";
import { hargaRepository } from "../harga/harga.repository.js";
import { getWeatherDataCached } from "../weather/weather.service.js";

export interface AgentConsultRequest {
  user_question: string;
  latitude?: number;
  longitude?: number;
  province?: string;
  city_regency?: string;
  commodities?: string[];
}

export interface AgentContextData {
  weather: {
    temperature: number;
    humidity: number;
    condition: string;
    windSpeed: number;
    recommendation: string;
    timestamp: string;
    location: string;
  };
  prices: Array<{
    commodity: string;
    pricePerKg: number;
    province: string;
    regency: string;
    sampledAt: string;
    trend?: string;
  }>;
  anomalies: Array<{
    commodity: string;
    riskLevel: string;
    latest: number;
    priceChange: number;
    zScore: number;
  }>;
  recentReports: Array<{
    commodity: string;
    pricePerKg: number;
    district: string;
    createdAt: string;
    status: string;
  }>;
  reportSummary: {
    scope: "LOCATION" | "ALL_REPORTS_FALLBACK";
    totalReports: number;
    todayReports: number;
    anomalyReports: number;
    lowReports: number;
    highReports: number;
    normalReports: number;
    insufficientDataReports: number;
    averagePrice: number | null;
    byCommodity: Array<{
      commodity: string;
      count: number;
      averagePrice: number;
      minPrice: number;
      maxPrice: number;
      lowCount: number;
      highCount: number;
      normalCount: number;
      latestPrice: number;
      latestStatus: string;
      latestAt: string;
    }>;
  };
  metadata: {
    province: string;
    city: string;
    latitude: number;
    longitude: number;
    fetchedAt: string;
  };
}

const QUESTION_COMMODITY_KEYWORDS = [
  "beras",
  "gabah",
  "jagung",
  "cabai",
  "cabe",
  "bawang",
  "telur",
  "gula",
  "minyak",
  "daging",
  "ayam",
  "sapi",
  "kedelai",
  "ubi",
  "singkong"
];

function inferRequestedCommodities(
  question: string,
  explicitCommodities?: string[]
) {
  const explicit = explicitCommodities?.map((item) => item.trim()).filter(Boolean);
  if (explicit?.length) return explicit;

  const text = question.toLowerCase();
  return QUESTION_COMMODITY_KEYWORDS.filter((keyword) => text.includes(keyword)).map((keyword) =>
    keyword === "cabe" ? "cabai" : keyword
  );
}

type AgentReportRow = {
  commodity: string;
  pricePerKg: number;
  district: string;
  status: string;
  createdAt: Date;
};

type CommodityReportSummary = {
  commodity: string;
  prices: number[];
  lowCount: number;
  highCount: number;
  normalCount: number;
  latestPrice: number;
  latestStatus: string;
  latestAt: string;
};

async function gatherMarketSignals(
  province: string,
  city: string,
  latitude: number,
  longitude: number,
  commodities?: string[]
): Promise<Pick<AgentContextData, "anomalies" | "recentReports" | "reportSummary">> {
  try {
    const targetCommodities = commodities?.map((item) => item.trim()).filter(Boolean);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const coordinateWindow = 0.35;
    const locationConditions = [
      ...(city
        ? [{ district: { contains: city, mode: "insensitive" as const } }]
        : []),
      ...(Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [
            {
              latitude: { gte: latitude - coordinateWindow, lte: latitude + coordinateWindow },
              longitude: { gte: longitude - coordinateWindow, lte: longitude + coordinateWindow }
            }
          ]
        : [])
    ];
    const commodityWhere = targetCommodities?.length
      ? { commodity: { in: targetCommodities, mode: "insensitive" as const } }
      : {};
    const where = {
      ...commodityWhere,
      ...(locationConditions.length ? { OR: locationConditions } : {})
    };

    const reports = (await prisma.priceReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        commodity: true,
        pricePerKg: true,
        district: true,
        status: true,
        createdAt: true
      }
    })) as AgentReportRow[];

    const usesLocationReports = reports.length > 0 || !city;
    const reportsForSummary: AgentReportRow[] = usesLocationReports
      ? reports
      : ((await prisma.priceReport.findMany({
          where: commodityWhere,
          orderBy: { createdAt: "desc" },
          take: 300,
          select: {
            commodity: true,
            pricePerKg: true,
            district: true,
            status: true,
            createdAt: true
          }
        })) as AgentReportRow[]);

    const summaryByCommodity = new Map<string, CommodityReportSummary>();

    for (const report of reportsForSummary) {
      const key = report.commodity.toLowerCase();
      const current =
        summaryByCommodity.get(key) ??
        {
          commodity: report.commodity,
          prices: [],
          lowCount: 0,
          highCount: 0,
          normalCount: 0,
          latestPrice: report.pricePerKg,
          latestStatus: report.status,
          latestAt: report.createdAt.toISOString()
        };

      current.prices.push(report.pricePerKg);
      if (report.status === "LOW") current.lowCount += 1;
      if (report.status === "HIGH") current.highCount += 1;
      if (report.status === "NORMAL") current.normalCount += 1;

      if (report.createdAt.toISOString() >= current.latestAt) {
        current.latestPrice = report.pricePerKg;
        current.latestStatus = report.status;
        current.latestAt = report.createdAt.toISOString();
      }

      summaryByCommodity.set(key, current);
    }

    const byCommodity = Array.from(summaryByCommodity.values()).map((item: CommodityReportSummary) => ({
      commodity: item.commodity,
      count: item.prices.length,
      averagePrice: Math.round(
        item.prices.reduce((total: number, price: number) => total + price, 0) / item.prices.length
      ),
      minPrice: Math.min(...item.prices),
      maxPrice: Math.max(...item.prices),
      lowCount: item.lowCount,
      highCount: item.highCount,
      normalCount: item.normalCount,
      latestPrice: item.latestPrice,
      latestStatus: item.latestStatus,
      latestAt: item.latestAt
    }));

    const totalReports = reportsForSummary.length;
    const lowReports = reportsForSummary.filter((item: AgentReportRow) => item.status === "LOW").length;
    const highReports = reportsForSummary.filter((item: AgentReportRow) => item.status === "HIGH").length;
    const normalReports = reportsForSummary.filter((item: AgentReportRow) => item.status === "NORMAL").length;
    const insufficientDataReports = reportsForSummary.filter(
      (item: AgentReportRow) => item.status === "INSUFFICIENT_DATA"
    ).length;
    const todayReports = reportsForSummary.filter(
      (item: AgentReportRow) => item.createdAt >= startOfToday
    ).length;
    const averagePrice =
      totalReports > 0
        ? Math.round(
            reportsForSummary.reduce(
              (total: number, item: AgentReportRow) => total + item.pricePerKg,
              0
            ) / totalReports
          )
        : null;

    const anomalies = byCommodity
      .filter((item) => item.lowCount > 0 || item.highCount > 0)
      .map((item) => ({
        commodity: item.commodity,
        riskLevel: item.lowCount + item.highCount > 3 ? "CRITICAL" : "WARNING",
        latest: item.latestPrice,
        priceChange: 0,
        zScore: 0
      }));

    return {
      anomalies,
      recentReports: reportsForSummary.slice(0, 8).map((item: AgentReportRow) => ({
        commodity: item.commodity,
        pricePerKg: item.pricePerKg,
        district: item.district,
        createdAt: item.createdAt.toISOString(),
        status: item.status
      })),
      reportSummary: {
        scope: usesLocationReports ? "LOCATION" : "ALL_REPORTS_FALLBACK",
        totalReports,
        todayReports,
        anomalyReports: lowReports + highReports,
        lowReports,
        highReports,
        normalReports,
        insufficientDataReports,
        averagePrice,
        byCommodity: byCommodity.sort((a, b) => b.count - a.count).slice(0, 12)
      }
    };
  } catch (error) {
    console.error("Error gathering report signals:", error);

    return {
      anomalies: [],
      recentReports: [],
      reportSummary: {
        scope: "LOCATION",
        totalReports: 0,
        todayReports: 0,
        anomalyReports: 0,
        lowReports: 0,
        highReports: 0,
        normalReports: 0,
        insufficientDataReports: 0,
        averagePrice: null,
        byCommodity: []
      }
    };
  }
}

export async function gatherAgentContext(
  request: AgentConsultRequest
): Promise<AgentContextData> {
  const latitude = request.latitude ?? -8.0772;
  const longitude = request.longitude ?? 111.3868;
  const province = request.province?.trim() || "Jawa Timur";
  const city = request.city_regency?.trim() || "Tulungagung";
  const requestedCommodities = inferRequestedCommodities(
    request.user_question,
    request.commodities
  );

  try {
    const [weatherData, pricesData, marketSignals] = await Promise.all([
      getWeatherDataCached({ latitude, longitude, province, city }),
      gatherPriceData(province, city, requestedCommodities),
      gatherMarketSignals(province, city, latitude, longitude, requestedCommodities)
    ]);

    return {
      weather: {
        temperature: Math.round(weatherData.temperature),
        humidity: Math.round(weatherData.humidity),
        condition: weatherData.weatherCondition,
        windSpeed: Math.round(weatherData.windSpeed * 10) / 10,
        recommendation: weatherData.recommendation,
        timestamp: weatherData.timestamp.toISOString(),
        location: `${city}, ${province}`
      },
      prices: pricesData,
      anomalies: marketSignals.anomalies,
      recentReports: marketSignals.recentReports,
      reportSummary: marketSignals.reportSummary,
      metadata: {
        province,
        city,
        latitude,
        longitude,
        fetchedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("Error gathering agent context:", error);
    throw new Error("Gagal mengumpulkan data konteks untuk konsultasi RAG");
  }
}

async function gatherPriceData(
  province: string,
  city: string,
  commodities?: string[]
): Promise<AgentContextData["prices"]> {
  try {
    const keyword = commodities?.[0];
    const locationPrices = await hargaRepository.referencePrices({
      province,
      regency: city,
      commodity: keyword
    });
    const provincePrices =
      locationPrices.length > 0
        ? locationPrices
        : await hargaRepository.referencePrices({
            province,
            commodity: keyword
          });

    const filteredPrices =
      commodities?.length && !keyword
        ? provincePrices.filter((item) =>
            commodities.some((commodity) =>
              item.commodity.toLowerCase().includes(commodity.toLowerCase())
            )
          )
        : provincePrices;

    const uniqueByCommodity = new Map<string, AgentContextData["prices"][number]>();

    for (const item of filteredPrices) {
      const key = `${item.commodity.toLowerCase()}|${item.regency.toLowerCase()}`;
      if (uniqueByCommodity.has(key)) continue;

      uniqueByCommodity.set(key, {
        commodity: item.commodity,
        pricePerKg: item.pricePerKg,
        province: item.province,
        regency: item.regency,
        sampledAt: item.sampledAt.split("T")[0],
        trend: "ACUAN_TERBARU"
      });
    }

    const priceRecords = Array.from(uniqueByCommodity.values()).sort(
      (a, b) => a.commodity.localeCompare(b.commodity, "id-ID")
    );

    return priceRecords.slice(0, commodities?.length ? 24 : 12);
  } catch (error) {
    console.error("Error gathering price data:", error);
    return [];
  }
}

const APP_SCOPE_KEYWORDS = [
  "harga",
  "komoditas",
  "beras",
  "jagung",
  "gabah",
  "kedelai",
  "ubi",
  "cabai",
  "bawang",
  "telur",
  "pihps",
  "bapanas",
  "cuaca",
  "bmkg",
  "lokasi",
  "kabupaten",
  "kota",
  "provinsi",
  "lahan",
  "petani",
  "pasar",
  "anomali",
  "lelang",
  "laporan",
  "harga referensi",
  "harga acuan",
  "trend",
  "suhu",
  "kelembapan",
  "tanam",
  "panen",
  "tani",
  "aktivitas",
  "strategi",
  "jual",
  "beli",
  "acuan",
  "referensi",
  "optimal",
  "wajar",
  "rekomendasi",
  "peringatan",
  "alert"
];

const OUT_OF_SCOPE_PATTERNS = [
  "presiden",
  "olahraga",
  "film",
  "musik",
  "game",
  "teknologi",
  "rumus",
  "matematika",
  "sejarah",
  "hukum",
  "politik",
  "cara masak",
  "resep",
  "wisata",
  "cuaca di luar",
  "kesehatan",
  "dokter",
  "psikologi",
  "programming",
  "coding",
  "bahasa inggris"
];

export function isOutOfScopeQuestion(userQuestion: string): boolean {
  const text = userQuestion.toLowerCase();

  if (!text.trim()) {
    return true;
  }

  const hasExplicitOutOfScope = OUT_OF_SCOPE_PATTERNS.some((pattern) => text.includes(pattern));
  const hasScopeKeyword = APP_SCOPE_KEYWORDS.some((keyword) => text.includes(keyword));

  if (hasExplicitOutOfScope && !hasScopeKeyword) {
    return true;
  }

  const isDatabaseLikeQuestion =
    hasScopeKeyword ||
    text.includes("harga") ||
    text.includes("cuaca") ||
    text.includes("komoditas") ||
    text.includes("provinsi") ||
    text.includes("kabupaten") ||
    text.includes("kota") ||
    text.includes("pihps") ||
    text.includes("bapanas") ||
    text.includes("pasar") ||
    text.includes("lelang") ||
    text.includes("laporan") ||
    text.includes("anomali") ||
    text.includes("petani") ||
    text.includes("tani") ||
    text.includes("panen") ||
    text.includes("rekomendasi") ||
    text.includes("strategi");

  if (!isDatabaseLikeQuestion) {
    return true;
  }

  return false;
}

export function buildOutOfScopeResponse(): string {
  return `
Saya hanya bisa membantu terkait data yang tersedia di aplikasi ini, seperti harga referensi, cuaca BMKG, laporan petani, anomali pasar, dan informasi wilayah/komoditas yang sudah terdaftar di database. Untuk pertanyaan di luar cakupan data aplikasi ini, saya tidak bisa memberikan jawaban karena saya harus tetap konsisten dengan informasi yang ada di sistem.
`;
}

export function formatContextForLLM(context: AgentContextData): string {
  const pricesList = context.prices
    .map(
      (p) => `- ${p.commodity}: Rp ${p.pricePerKg.toLocaleString("id-ID")}/kg (${p.trend ?? "STABIL"}, ${p.sampledAt})`
    )
    .join("\n");

  const anomaliesList = context.anomalies.length
    ? context.anomalies
        .map(
          (item) =>
            `- ${item.commodity}: ${item.riskLevel}, perubahan ${item.priceChange.toFixed(1)}%, z-score ${item.zScore.toFixed(2)}`
        )
        .join("\n")
    : "- Tidak ada sinyal anomali yang kuat pada data yang tersedia.";

  const reportsList = context.recentReports.length
    ? context.recentReports
        .slice(0, 5)
        .map(
          (item) =>
            `- ${item.commodity}: Rp ${item.pricePerKg.toLocaleString("id-ID")}/kg di ${item.district} (${item.status})`
        )
        .join("\n")
    : "- Belum ada laporan terbaru dari petani di daerah ini.";

  const reportSummary = context.reportSummary;
  const commodityAverages = reportSummary.byCommodity.length
    ? reportSummary.byCommodity
        .map(
          (item) =>
            `- ${item.commodity}: rata-rata Rp ${item.averagePrice.toLocaleString("id-ID")}/kg dari ${item.count} laporan, min Rp ${item.minPrice.toLocaleString("id-ID")}, max Rp ${item.maxPrice.toLocaleString("id-ID")}, LOW ${item.lowCount}, HIGH ${item.highCount}, terbaru Rp ${item.latestPrice.toLocaleString("id-ID")}/kg (${item.latestStatus}, ${item.latestAt})`
        )
        .join("\n")
    : "- Belum ada agregasi laporan harga petani untuk wilayah/komoditas ini.";

  return `
KONTEKS SISTEM PANGANTERKINI

LOKASI DAN KOORDINAT:
- Wilayah: ${context.metadata.city}, ${context.metadata.province}
- Koordinat: ${context.metadata.latitude.toFixed(4)}, ${context.metadata.longitude.toFixed(4)}
- Waktu sinkronisasi: ${context.metadata.fetchedAt}

CUACA BMKG:
- Suhu: ${context.weather.temperature}°C
- Kelembapan: ${context.weather.humidity}%
- Kondisi: ${context.weather.condition}
- Kecepatan angin: ${context.weather.windSpeed} km/h
- Rekomendasi: ${context.weather.recommendation}
- Timestamp: ${context.weather.timestamp}

HARGA ACUAN PIHPS:
${pricesList || "- Tidak ada data harga PIHPS untuk wilayah ini."}

RINGKASAN LAPORAN HARGA PETANI:
- Cakupan laporan: ${
    reportSummary.scope === "LOCATION"
      ? `${context.metadata.city}, ${context.metadata.province}`
      : `SEMUA LOKASI DI DATABASE. Belum ada laporan yang cocok dengan lokasi aktif ${context.metadata.city}, ${context.metadata.province}; jangan sebut angka ini sebagai data khusus daerah user.`
  }
- Total laporan pada cakupan lokasi/komoditas ini: ${reportSummary.totalReports}
- Laporan hari ini: ${reportSummary.todayReports}
- Total laporan anomali: ${reportSummary.anomalyReports}
- LOW: ${reportSummary.lowReports}
- HIGH: ${reportSummary.highReports}
- NORMAL: ${reportSummary.normalReports}
- INSUFFICIENT_DATA: ${reportSummary.insufficientDataReports}
- Rata-rata nominal seluruh laporan lintas komoditas (indikator kasar, bukan harga satu komoditas): ${
    reportSummary.averagePrice
      ? `Rp ${reportSummary.averagePrice.toLocaleString("id-ID")}/kg`
      : "belum tersedia"
  }

RERATA LAPORAN PER KOMODITAS:
${commodityAverages}

MONITOR ANOMALI BERDASARKAN LAPORAN:
${anomaliesList}

LAPORAN TERBARU PETANI:
${reportsList}

PERINTAH:
Jawab hanya berdasarkan data di aplikasi ini. Jika user bertanya jumlah laporan anomali di daerahnya, gunakan angka "Total laporan anomali", LOW, dan HIGH dari ringkasan laporan, lalu sebutkan cakupannya. Jika cakupan laporan adalah SEMUA LOKASI DI DATABASE, wajib katakan terlebih dulu bahwa belum ada laporan yang cocok dengan lokasi aktif user, lalu nyatakan angka tersebut sebagai data seluruh database; dilarang menyebutnya sebagai "di daerah Anda" atau "di Sidoarjo". Jika user bertanya rata-rata harga cabai/komoditas di daerahnya, gunakan "RERATA LAPORAN PER KOMODITAS" bila tersedia; jangan memakai rata-rata nominal lintas komoditas untuk menjawab harga satu komoditas. Jika rerata laporan per komoditas tidak tersedia, pakai "HARGA ACUAN PIHPS" dan jelaskan bahwa itu harga acuan, bukan rata-rata laporan petani. Jika pertanyaan tidak terkait dengan data harga, cuaca BMKG, koordinat, laporan petani, komoditas, atau anomali pasar yang tersedia di database, jangan menjawab dari pengetahuan umum; katakan dengan halus bahwa Anda hanya bisa menjawab topik yang ada di database aplikasi.
`;
}

function findRequestedCommodityInContext(userQuestion: string, context: AgentContextData) {
  const text = userQuestion.toLowerCase();
  const candidates = [
    ...context.reportSummary.byCommodity.map((item) => item.commodity),
    ...context.prices.map((item) => item.commodity)
  ];

  return candidates.find((commodity) => {
    const normalized = commodity.toLowerCase();
    return (
      text.includes(normalized) ||
      normalized.split(/\s+/).some((part) => part.length >= 4 && text.includes(part))
    );
  });
}

function buildFallbackResponse(
  userQuestion: string,
  systemContext: string,
  context?: AgentContextData
): string {
  const lowerQuestion = userQuestion.toLowerCase();

  if (isOutOfScopeQuestion(userQuestion)) {
    return buildOutOfScopeResponse();
  }

  if (context && (lowerQuestion.includes("anomali") || lowerQuestion.includes("low") || lowerQuestion.includes("high"))) {
    const summary = context.reportSummary;
    const recentAnomalies = context.recentReports.filter(
      (item) => item.status === "LOW" || item.status === "HIGH"
    );
    const isLocationScope = summary.scope === "LOCATION";

    return `
## ${
  isLocationScope
    ? `Laporan Anomali di ${context.metadata.city}, ${context.metadata.province}`
    : "Laporan Anomali Seluruh Database"
}

Berdasarkan data laporan harga di aplikasi:

- Cakupan laporan: **${
      isLocationScope
        ? `${context.metadata.city}, ${context.metadata.province}`
        : `semua lokasi di database; belum ada laporan yang cocok dengan lokasi aktif ${context.metadata.city}, ${context.metadata.province}`
    }**
- Periode data: **semua laporan tersimpan yang cocok dengan cakupan tersebut**
- Total laporan anomali: **${summary.anomalyReports}**
- LOW: **${summary.lowReports}**
- HIGH: **${summary.highReports}**
- Laporan hari ini: **${summary.todayReports}**
- Total laporan yang terbaca pada cakupan ini: **${summary.totalReports}**

${!isLocationScope ? `Catatan: angka di atas **bukan angka khusus ${context.metadata.city}**, melainkan agregat seluruh database karena lokasi aktif belum punya laporan yang cocok.\n\n` : ""}${
  recentAnomalies.length
    ? `Laporan anomali terbaru:\n${recentAnomalies
        .slice(0, 5)
        .map(
          (item) =>
            `- ${item.commodity}: Rp ${item.pricePerKg.toLocaleString("id-ID")}/kg di ${item.district} (${item.status})`
        )
        .join("\n")}`
    : "Belum ada laporan LOW/HIGH terbaru pada cakupan data ini."
}
`;
  }

  if (
    context &&
    (lowerQuestion.includes("rata") ||
      lowerQuestion.includes("rerata") ||
      lowerQuestion.includes("berapa") ||
      lowerQuestion.includes("harga"))
  ) {
    const commodity = findRequestedCommodityInContext(userQuestion, context);
    const reportAverage = commodity
      ? context.reportSummary.byCommodity.find(
          (item) => item.commodity.toLowerCase() === commodity.toLowerCase()
        )
      : context.reportSummary.byCommodity[0];
    const referenceMatches = commodity
      ? context.prices.filter((item) =>
          item.commodity.toLowerCase().includes(commodity.toLowerCase())
        )
      : context.prices.slice(0, 5);

    if (reportAverage) {
      return `
## Rata-rata Laporan Harga ${reportAverage.commodity}

Untuk cakupan ${context.metadata.city}, ${context.metadata.province}, rata-rata laporan petani adalah **Rp ${reportAverage.averagePrice.toLocaleString("id-ID")}/kg** dari **${reportAverage.count} laporan**.

- Harga terendah laporan: Rp ${reportAverage.minPrice.toLocaleString("id-ID")}/kg
- Harga tertinggi laporan: Rp ${reportAverage.maxPrice.toLocaleString("id-ID")}/kg
- LOW: ${reportAverage.lowCount}
- HIGH: ${reportAverage.highCount}
- Harga terbaru: Rp ${reportAverage.latestPrice.toLocaleString("id-ID")}/kg (${reportAverage.latestStatus})
`;
    }

    if (referenceMatches.length > 0) {
      const hasLocalReference = referenceMatches.some((item) =>
        item.regency.toLowerCase().includes(context.metadata.city.toLowerCase())
      );

      return `
## Harga Acuan di ${context.metadata.city}, ${context.metadata.province}

Belum ada rata-rata laporan petani yang cocok untuk pertanyaan ini. ${
  hasLocalReference
    ? "Data yang tersedia adalah harga acuan untuk lokasi aktif:"
    : `Belum ada harga acuan khusus ${context.metadata.city} untuk komoditas ini, jadi saya tampilkan acuan ${context.metadata.province} dari CSV/PIHPS:`
}

${referenceMatches
  .slice(0, 8)
  .map(
    (item) =>
      `- ${item.commodity} (${item.regency}): Rp ${item.pricePerKg.toLocaleString("id-ID")}/kg, sumber ${item.trend ?? "ACUAN"} tanggal ${item.sampledAt}`
  )
  .join("\n")}
`;
    }
  }

  if (context && (lowerQuestion.includes("cuaca") || lowerQuestion.includes("bmkg"))) {
    return `
## Cuaca BMKG ${context.weather.location}

- Suhu: **${context.weather.temperature}°C**
- Kelembapan: **${context.weather.humidity}%**
- Kondisi: **${context.weather.condition}**
- Angin: **${context.weather.windSpeed} km/h**

Rekomendasi tani: ${context.weather.recommendation}
`;
  }

  if (lowerQuestion.includes("harga") || lowerQuestion.includes("lelang") || lowerQuestion.includes("jual")) {
    return `
## Rekomendasi Harga Jual Wajar

Berdasarkan konteks yang tersedia, saya sarankan:

1. Gunakan harga acuan PIHPS sebagai benchmark utama.
2. Berikan margin 5-10% untuk biaya operasional dan keuntungan.
3. Sesuaikan dengan kualitas hasil panen:
   - Grade premium: +15%
   - Grade standar: +7%
   - Grade biasa: 0% sampai +5%
4. Jika tren harga naik dalam 7 hari terakhir, Anda dapat menaikkan posisi tawaran lebih tinggi.
5. Jika cuaca tidak stabil atau ada sinyal anomali, pertimbangkan menjual lebih cepat untuk menghindari risiko.

Catatan: jawaban ini bersumber dari data aplikasi yang terkumpul dan dapat diperhalus jika Anda menghubungkan API LLM resmi.
`;
  }

  if (lowerQuestion.includes("cuaca") || lowerQuestion.includes("tani") || lowerQuestion.includes("tanam")) {
    return `
## Rekomendasi Aktivitas Tani

Dari data cuaca terkini yang terintegrasi:

- Suhu dan kelembapan menunjukkan kondisi ${systemContext.includes("Hujan") ? "curah hujan" : "beragam"}.
- Saat cuaca tidak stabil, prioritaskan pencegahan hama, drainase, dan pengamanan lahan.
- Jika cuaca cerah, manfaatkan momen untuk pemupukan, penjemuran, atau penyemprotan bila aman.
- Jika hujan/angin tinggi, tunggu kondisi aman sebelum kegiatan di lahan.

Silakan cek data cuaca dan target pasar lokal untuk keputusan harian.
`;
  }

  return `
## Jawaban berbasis data PanganTerkini

Saya menganalisis data berikut:

${systemContext}

Kesimpulannya:
- Prioritaskan keputusan berdasarkan harga acuan PIHPS terbaru.
- Pertimbangkan rekomendasi cuaca dan anomali pasar sebelum mengambil tindakan.
- Gunakan koordinat daerah Anda agar rekomendasi lebih spesifik terhadap wilayah pertanian yang dikelola.

Jika ingin hasil yang lebih presisi, aktifkan API key LLM pada konfigurasi server.
`;
}

export async function callRAGLLM(
  userQuestion: string,
  systemContext: string,
  context?: AgentContextData
): Promise<string> {
  if (isOutOfScopeQuestion(userQuestion)) {
    return buildOutOfScopeResponse();
  }

  const apiKey = env.llmApiKey;
  const normalizedBase = (env.llmBaseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.llmModel ?? "gpt-4o-mini";

  if (!apiKey) {
    if (!env.llmFallbackEnabled) {
      throw new Error("LLM API key belum diatur. Tambahkan LLM_API_KEY atau OPENAI_API_KEY di environment");
    }
    return buildFallbackResponse(userQuestion, systemContext, context);
  }

  try {
    const response = await fetch(`${normalizedBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Anda adalah asisten agribisnis PanganTerkini. Jawab dengan jelas, spesifik, dan berbasis data. Gunakan hanya konteks aplikasi: koordinat, cuaca BMKG, harga acuan PIHPS/BAPANAS/CSV, ringkasan laporan petani, rerata laporan per komoditas, dan laporan anomali LOW/HIGH. Untuk pertanyaan jumlah anomali, sebutkan total anomali, LOW, HIGH, dan cakupan laporannya. Jika cakupan laporan adalah semua lokasi/database fallback, wajib katakan bahwa belum ada laporan yang cocok dengan lokasi aktif user dan angka tersebut adalah agregat seluruh database, bukan data daerah user. Dilarang menyebut angka fallback sebagai data 'di daerah Anda'. Untuk pertanyaan rata-rata harga komoditas di daerah user, gunakan rerata laporan per komoditas bila ada; bila tidak ada, gunakan harga acuan dan nyatakan bahwa itu acuan, bukan rata-rata laporan. Jangan memakai rata-rata lintas komoditas sebagai jawaban harga komoditas tertentu. Jangan berimprovisasi bila data tidak tersedia. Jelaskan batasan data dengan jujur."
          },
          {
            role: "user",
            content: `Pertanyaan user:\n${userQuestion}\n\nKonteks aplikasi:\n${systemContext}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API error:", errorText);
      if (!env.llmFallbackEnabled) {
        throw new Error("LLM request gagal dan fallback disabled");
      }
      return buildFallbackResponse(userQuestion, systemContext, context);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return buildFallbackResponse(userQuestion, systemContext, context);
    }

    return content;
  } catch (error) {
    console.error("Error calling LLM:", error);
    if (!env.llmFallbackEnabled) {
      throw error;
    }
    return buildFallbackResponse(userQuestion, systemContext, context);
  }
}
