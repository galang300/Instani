import type { HeatmapPoint, PriceReport } from "@panganterkini/shared-types";

export const demoPriceReports: PriceReport[] = [
  {
    id: "rpt-001",
    commodity: "Gabah Kering Panen",
    pricePerKg: 5200,
    volumeKg: 900,
    district: "Ngantru",
    village: "Pucunglor",
    reporterName: "Siti Aminah",
    source: "WHATSAPP",
    createdAt: new Date().toISOString(),
    location: { lat: -7.9532, lng: 111.9032 },
    zScore: -1.9,
    status: "LOW"
  },
  {
    id: "rpt-002",
    commodity: "Beras Medium",
    pricePerKg: 13200,
    volumeKg: 420,
    district: "Kedungwaru",
    village: "Bangoan",
    reporterName: "Gapoktan Makmur",
    source: "WEB",
    createdAt: new Date().toISOString(),
    location: { lat: -8.0376, lng: 111.9292 },
    zScore: 0.2,
    status: "NORMAL"
  },
  {
    id: "rpt-003",
    commodity: "Cabai Rawit",
    pricePerKg: 41500,
    volumeKg: 60,
    district: "Ngunut",
    village: "Pandansari",
    reporterName: "Budi Santoso",
    source: "MOBILE",
    createdAt: new Date().toISOString(),
    location: { lat: -8.1081, lng: 112.0178 },
    zScore: 1.7,
    status: "HIGH"
  },
  {
    id: "rpt-004",
    commodity: "Jagung Pipilan",
    pricePerKg: 6100,
    volumeKg: 1200,
    district: "Kalidawir",
    village: "Tunggangri",
    reporterName: "Koperasi Tani Kidul",
    source: "ADMIN",
    createdAt: new Date().toISOString(),
    location: { lat: -8.1859, lng: 111.9721 },
    zScore: -0.4,
    status: "NORMAL"
  }
];

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
