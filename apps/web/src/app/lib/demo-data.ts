import type { HeatmapPoint, PriceReport, ReferencePrice } from "@panganterkini/shared-types";

export const demoPriceReports: PriceReport[] = [
  {
    id: "rpt-001",
    commodity: "Gabah Kering Panen",
    pricePerKg: 4700,
    volumeKg: 900,
    district: "Sidoarjo",
    village: "Candi",
    reporterName: "Siti Aminah",
    source: "WHATSAPP",
    createdAt: new Date().toISOString(),
    location: { lat: -7.4619, lng: 112.7178 },
    zScore: -2.1,
    status: "LOW"
  },
  {
    id: "rpt-002",
    commodity: "Beras Medium",
    pricePerKg: 13200,
    volumeKg: 420,
    district: "Sidoarjo",
    village: "Buduran",
    reporterName: "Gapoktan Makmur",
    source: "WEB",
    createdAt: new Date().toISOString(),
    location: { lat: -7.4261, lng: 112.7217 },
    zScore: 0.2,
    status: "NORMAL"
  },
  {
    id: "rpt-003",
    commodity: "Cabai Rawit",
    pricePerKg: 78000,
    volumeKg: 60,
    district: "Sidoarjo",
    village: "Krian",
    reporterName: "Budi Santoso",
    source: "MOBILE",
    createdAt: new Date().toISOString(),
    location: { lat: -7.4102, lng: 112.5766 },
    zScore: 2.4,
    status: "HIGH"
  },
  {
    id: "rpt-004",
    commodity: "Bawang Merah",
    pricePerKg: 31500,
    volumeKg: 180,
    district: "Sidoarjo",
    village: "Waru",
    reporterName: "Koperasi Tani Kidul",
    source: "ADMIN",
    createdAt: new Date().toISOString(),
    location: { lat: -7.3518, lng: 112.7387 },
    zScore: -0.4,
    status: "NORMAL"
  },
  {
    id: "rpt-005",
    commodity: "Telur Ayam",
    pricePerKg: 34800,
    volumeKg: 220,
    district: "Sidoarjo",
    village: "Taman",
    reporterName: "Pak Rudi",
    source: "WEB",
    createdAt: new Date().toISOString(),
    location: { lat: -7.3652, lng: 112.6897 },
    zScore: 1.9,
    status: "HIGH"
  },
  {
    id: "rpt-006",
    commodity: "Jagung Pipilan",
    pricePerKg: 5200,
    volumeKg: 1200,
    district: "Sidoarjo",
    village: "Porong",
    reporterName: "Kelompok Tani Porong",
    source: "MOBILE",
    createdAt: new Date().toISOString(),
    location: { lat: -7.5411, lng: 112.6949 },
    zScore: -1.8,
    status: "LOW"
  }
];

export const demoReferencePrices: ReferencePrice[] = [
  {
    id: "ref-001",
    commodity: "Beras Medium",
    pricePerKg: 13600,
    source: "PIHPS",
    province: "Jawa Timur",
    regency: "Sidoarjo",
    sampledAt: new Date().toISOString()
  },
  {
    id: "ref-002",
    commodity: "Gabah Kering Panen",
    pricePerKg: 5600,
    source: "BAPANAS",
    province: "Jawa Timur",
    regency: "Sidoarjo",
    sampledAt: new Date().toISOString()
  },
  {
    id: "ref-003",
    commodity: "Cabai Rawit",
    pricePerKg: 62000,
    source: "PIHPS",
    province: "Jawa Timur",
    regency: "Sidoarjo",
    sampledAt: new Date().toISOString()
  },
  {
    id: "ref-004",
    commodity: "Bawang Merah",
    pricePerKg: 32500,
    source: "BAPANAS",
    province: "Jawa Timur",
    regency: "Sidoarjo",
    sampledAt: new Date().toISOString()
  },
  {
    id: "ref-005",
    commodity: "Telur Ayam",
    pricePerKg: 31000,
    source: "PIHPS",
    province: "Jawa Timur",
    regency: "Sidoarjo",
    sampledAt: new Date().toISOString()
  },
  {
    id: "ref-006",
    commodity: "Jagung Pipilan",
    pricePerKg: 6100,
    source: "BAPANAS",
    province: "Jawa Timur",
    regency: "Sidoarjo",
    sampledAt: new Date().toISOString()
  }
];

export const demoWeather = {
  temperature: 27,
  humidity: 75,
  weatherCondition: "Berawan",
  windSpeed: 8,
  recommendation:
    "Cuaca berawan dan angin rendah. Waktu cukup baik untuk penyemprotan hama, pengecekan drainase, dan pengeringan hasil panen dengan pemantauan berkala.",
  timestamp: new Date().toISOString(),
  location: "Sidoarjo, Jawa Timur"
};

export const heatmapPoints: HeatmapPoint[] = demoPriceReports.map((report, index) => ({
  id: report.id,
  district: report.district,
  commodity: report.commodity,
  pricePerKg: report.pricePerKg,
  status: report.status ?? "INSUFFICIENT_DATA",
  location: report.location,
  sampleSize: 8 + index * 3,
  createdAt: report.createdAt,
  reporterName: report.reporterName,
  zScore: report.zScore
}));
