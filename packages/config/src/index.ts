export const COMMODITIES = [
  "Beras Medium",
  "Gabah Kering Panen",
  "Jagung Pipilan",
  "Cabai Rawit",
  "Bawang Merah",
  "Telur Ayam"
] as const;

export const TULUNGAGUNG_DISTRICTS = [
  { name: "Ngantru", lat: -7.9532, lng: 111.9032 },
  { name: "Kedungwaru", lat: -8.0376, lng: 111.9292 },
  { name: "Boyolangu", lat: -8.0906, lng: 111.8998 },
  { name: "Kauman", lat: -8.0632, lng: 111.8447 },
  { name: "Gondang", lat: -8.0602, lng: 111.7941 },
  { name: "Ngunut", lat: -8.1081, lng: 112.0178 },
  { name: "Sendang", lat: -7.9445, lng: 111.7842 },
  { name: "Kalidawir", lat: -8.1859, lng: 111.9721 }
] as const;

export const ANOMALY_THRESHOLDS = {
  zScoreLow: -1.5,
  zScoreHigh: 1.5,
  minimumSamples: 5
} as const;

export const MVP_PHASES = [
  "Harga, input petani, Z-Score/IQR, warning harga rendah, WhatsApp bot",
  "Offline-first, heatmap, kalkulator HPP",
  "Lelang realtime, rating tengkulak, e-nota",
  "B2C, MOQ, group buying, self-pickup"
] as const;
