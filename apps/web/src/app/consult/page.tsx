"use client";

import { useEffect, useState } from "react";
import { RAGChat } from "../components/RAGChat";
import { WeatherCard } from "../components/WeatherCard";
import { detectUserLocation, type DetectedLocation } from "../lib/geolocation";

const DEFAULT_LOCATION: DetectedLocation = {
  latitude: -8.0772,
  longitude: 111.3868,
  province: "Jawa Timur",
  city: "Tulungagung",
  source: "default"
};

/**
 * Halaman Konsultasi RAG - Terintegrasi dengan cuaca BMKG & harga PIHPS
 */
export default function ConsultPage() {
  const [location, setLocation] = useState<DetectedLocation>(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState("Mendeteksi lokasi...");

  useEffect(() => {
    void (async () => {
      try {
        const detected = await detectUserLocation({ fallback: DEFAULT_LOCATION });
        setLocation(detected);
        setLocationStatus(
          detected.source === "gps"
            ? `Lokasi GPS aktif: ${detected.city}, ${detected.province}`
            : "Menggunakan lokasi default Tulungagung"
        );
      } catch {
        setLocation(DEFAULT_LOCATION);
        setLocationStatus("Geolocation tidak tersedia, menggunakan lokasi default");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 px-3 py-4 sm:p-4">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="py-3 text-center sm:py-6">
          <h1 className="mb-2 text-2xl font-black leading-tight text-emerald-900 sm:text-4xl">
            🌾 Konsultasi Tani Cerdas dengan AI
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-emerald-700 sm:text-lg">
            Dapatkan rekomendasi harga lelang wajar dan aktivitas tani berdasarkan data PIHPS
            terkini dan cuaca BMKG resmi
          </p>
          <p className="mt-2 text-sm text-emerald-600">{locationStatus}</p>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4 lg:col-span-1 lg:space-y-6">
            <WeatherCard
              province={location.province}
              city={location.city}
              latitude={location.latitude}
              longitude={location.longitude}
              autoFetch={true}
            />

            <div className="rounded-lg border-l-4 border-emerald-500 bg-white p-4 shadow-md">
              <h3 className="mb-3 font-bold text-emerald-900">📊 Fitur RAG Konsultasi</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span>💰</span>
                  <span>Rekomendasi harga jual wajar untuk lelang</span>
                </li>
                <li className="flex gap-2">
                  <span>🌤️</span>
                  <span>Panduan aktivitas tani per cuaca BMKG</span>
                </li>
                <li className="flex gap-2">
                  <span>📈</span>
                  <span>Tren harga & analisis pasar</span>
                </li>
                <li className="flex gap-2">
                  <span>🤖</span>
                  <span>AI bertenaga RAG dengan context injection</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-xs font-semibold text-blue-900">📡 SUMBER DATA RESMI</p>
              <div className="space-y-1 text-xs text-blue-800">
                <p>✓ Harga PIHPS (Bank Indonesia)</p>
                <p>✓ Cuaca BMKG (Real-time)</p>
                <p>✓ Data Lelang Platform PanganTerkini</p>
                <p>✓ Analisis AI dengan konteks lokal</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <RAGChat
              province={location.province}
              city={location.city}
              latitude={location.latitude}
              longitude={location.longitude}
            />
          </div>
        </div>

        <footer className="border-t border-emerald-100 py-4 text-center text-xs leading-5 text-gray-600">
          <p>
            Data cuaca diperbarui setiap 30 menit | Harga PIHPS real-time |
            Platform PanganTerkini © 2026
          </p>
        </footer>
      </div>
    </main>
  );
}
