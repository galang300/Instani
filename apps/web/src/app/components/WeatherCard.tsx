"use client";

import { useEffect, useState } from "react";
import { getHargaWithWeather } from "../lib/api";

interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  windSpeed: number;
  recommendation: string;
  location: string;
}

interface WeatherCardProps {
  province?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  autoFetch?: boolean;
}

/**
 * WeatherCard Component - Tampilkan cuaca BMKG dengan rekomendasi tani
 */
export function WeatherCard({
  province,
  city,
  latitude,
  longitude,
  autoFetch = true
}: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoFetch || !province || !city) return;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const data = await getHargaWithWeather({
          province,
          city,
          latitude,
          longitude
        });

        if (data.weather) {
          setWeather({
            temperature: Math.round(data.weather.temperature),
            humidity: Math.round(data.weather.humidity),
            condition: data.weather.weatherCondition,
            windSpeed: Math.round(data.weather.windSpeed * 10) / 10,
            recommendation: data.weather.recommendation,
            location: data.weather.location ?? `${city}, ${province}`
          });
          setError(null);
        } else {
          setError("Data cuaca tidak tersedia untuk lokasi ini");
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
        setError(err instanceof Error ? err.message : "Gagal mengambil cuaca");
      } finally {
        setLoading(false);
      }
    };

    void fetchWeather();

    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [province, city, latitude, longitude, autoFetch]);

  if (loading && !weather) {
    return (
      <div className="flex h-40 animate-pulse items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-amber-50 px-4 text-center">
        <span className="text-emerald-600">Memuat data cuaca...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50 px-4 text-center">
        <span className="text-sm font-semibold text-red-600">
          {error || "Data cuaca tidak tersedia"}
        </span>
      </div>
    );
  }

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("cerah") && !lower.includes("berawan")) return "☀️";
    if (lower.includes("berawan") || lower.includes("cerah berawan")) return "⛅";
    if (lower.includes("hujan petir") || lower.includes("badai")) return "⛈️";
    if (lower.includes("hujan")) return "🌧️";
    return "🌤️";
  };

  const getRecommendationBadgeColor = (recommendation: string) => {
    if (recommendation.includes("ideal") || recommendation.includes("optimal")) {
      return "bg-green-100 text-green-800";
    }
    if (recommendation.includes("tunda") || recommendation.includes("waspadai")) {
      return "bg-amber-100 text-amber-800";
    }
    if (recommendation.includes("berbahaya") || recommendation.includes("ekstrem")) {
      return "bg-red-100 text-red-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-4xl">{getWeatherIcon(weather.condition)}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-emerald-900">Cuaca BMKG</h3>
            <p className="text-sm leading-5 text-emerald-600">{weather.location}</p>
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
          📍 Data Resmi BMKG
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold">SUHU</p>
          <p className="text-2xl font-bold text-emerald-900">{weather.temperature}°C</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold">KELEMBAPAN</p>
          <p className="text-2xl font-bold text-blue-600">{weather.humidity}%</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold">KONDISI</p>
          <p className="text-sm font-bold text-emerald-800 line-clamp-2">
            {weather.condition}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold">ANGIN</p>
          <p className="text-2xl font-bold text-orange-600">{weather.windSpeed} km/h</p>
        </div>
      </div>

      <div
        className={`${getRecommendationBadgeColor(weather.recommendation)} rounded-lg p-4 border-l-4 border-current`}
      >
        <p className="text-xs font-semibold uppercase mb-1">🌾 Rekomendasi Bertani Hari Ini</p>
        <p className="text-sm leading-relaxed font-medium">{weather.recommendation}</p>
      </div>

      <p className="text-xs text-emerald-500 mt-3 text-right">
        Diperbarui: {new Date().toLocaleString("id-ID")}
      </p>
    </div>
  );
}
