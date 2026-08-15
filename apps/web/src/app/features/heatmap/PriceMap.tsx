"use client";

import "leaflet/dist/leaflet.css";
import type { HeatmapPoint } from "@panganterkini/shared-types";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { useMap } from "react-leaflet";
import { getHeatmapPoints } from "../../lib/api";
import { watchUserLocation } from "../../lib/geolocation";

const statusColor = {
  LOW: "#c83e4d",
  NORMAL: "#2f7d57",
  HIGH: "#f4a261",
  INSUFFICIENT_DATA: "#64748b"
} as const;

type UserLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
};

function coordinateKey(point: HeatmapPoint) {
  return `${point.location.lat.toFixed(5)},${point.location.lng.toFixed(5)}`;
}

function offsetDuplicateLocation(
  location: HeatmapPoint["location"],
  duplicateIndex: number,
  duplicateCount: number
) {
  if (duplicateCount <= 1) return location;

  const angle = (2 * Math.PI * duplicateIndex) / duplicateCount;
  const radius = 0.00018 + Math.floor(duplicateIndex / 8) * 0.00008;

  return {
    lat: location.lat + Math.cos(angle) * radius,
    lng: location.lng + Math.sin(angle) * radius
  };
}

function MapViewport({ location }: { location?: UserLocation }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 14);
    }
  }, [location, map]);

  return null;
}

export default function PriceMap() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>();
  const [status, setStatus] = useState("Memuat titik harga");

  async function loadHeatmap() {
    try {
      const nextPoints = await getHeatmapPoints();
      setPoints(nextPoints);
      setStatus(
        nextPoints.length > 0
          ? `${nextPoints.length.toLocaleString("id-ID")} laporan harga live dari API`
          : "Belum ada laporan harga tersimpan"
      );
    } catch {
      setStatus("Gagal memuat data heatmap");
    }
  }

  useEffect(() => {
    void loadHeatmap();
    const interval = window.setInterval(() => void loadHeatmap(), 15000);
    const refreshAfterSubmit = () => void loadHeatmap();
    window.addEventListener("price-report-created", refreshAfterSubmit);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("price-report-created", refreshAfterSubmit);
    };
  }, []);

  useEffect(() => {
    const stopWatching = watchUserLocation(
      (location) => {
        setUserLocation({
          lat: location.latitude,
          lng: location.longitude
        });
        setStatus((current) =>
          current === "Memuat titik harga" || current.includes("Lokasi")
            ? "Lokasi GPS aktif"
            : current
        );
      },
      (error) => {
        setStatus((current) =>
          current === "Memuat titik harga" ? error.message : current
        );
      }
    );

    return stopWatching;
  }, []);

  const mapCenter = useMemo<[number, number]>(
    () => (userLocation ? [userLocation.lat, userLocation.lng] : [-8.075, 111.9]),
    [userLocation]
  );

  const displayPoints = useMemo(() => {
    const duplicateCounts = new Map<string, number>();
    const seenCounts = new Map<string, number>();

    for (const point of points) {
      const key = coordinateKey(point);
      duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
    }

    return points.map((point) => {
      const key = coordinateKey(point);
      const duplicateIndex = seenCounts.get(key) ?? 0;
      seenCounts.set(key, duplicateIndex + 1);

      return {
        point,
        markerLocation: offsetDuplicateLocation(
          point.location,
          duplicateIndex,
          duplicateCounts.get(key) ?? 1
        )
      };
    });
  }, [points]);

  return (
    <div className="relative h-[360px] overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={mapCenter} zoom={userLocation ? 14 : 10} scrollWheelZoom={false}>
        <MapViewport location={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {displayPoints.map(({ point, markerLocation }) => (
          <CircleMarker
            key={point.id ?? `${point.district}-${point.commodity}-${point.location.lat}-${point.location.lng}`}
            center={[markerLocation.lat, markerLocation.lng]}
            pathOptions={{
              color: statusColor[point.status],
              fillColor: statusColor[point.status],
              fillOpacity: point.status === "LOW" || point.status === "HIGH" ? 0.86 : 0.72,
              weight: point.status === "LOW" || point.status === "HIGH" ? 4 : 2
            }}
            radius={point.status === "LOW" || point.status === "HIGH" ? 12 : 9}
          >
            <Popup>
              <strong>{point.district}</strong>
              <br />
              {point.commodity}
              <br />
              Rp{point.pricePerKg.toLocaleString("id-ID")}/kg
              <br />
              Status {point.status}
              <br />
              {typeof point.zScore === "number" ? <>z {point.zScore.toFixed(1)}<br /></> : null}
              {point.reporterName ? <>Pelapor {point.reporterName}<br /></> : null}
              {point.createdAt ? (
                <>
                  {new Date(point.createdAt).toLocaleString("id-ID")}
                  <br />
                </>
              ) : null}
              {point.sampleSize > 1 ? `${point.sampleSize} laporan di titik ini` : "1 laporan"}
            </Popup>
          </CircleMarker>
        ))}
        {userLocation ? (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.68
            }}
            radius={8}
          >
            <Popup>
              <strong>Lokasi saya</strong>
              <br />
              Akurasi {Math.round(userLocation.accuracy ?? 0).toLocaleString("id-ID")} m
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[450] rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        {status}
      </div>
    </div>
  );
}
