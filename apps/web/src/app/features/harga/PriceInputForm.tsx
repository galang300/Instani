"use client";

import { Crosshair, MapPin, Mic, Send, WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError, getReferencePrices, postPriceReport } from "../../lib/api";
import {
  clearPetaniSession,
  getStoredPetaniSession,
  PETANI_SESSION_EVENT,
  type PetaniSession
} from "../../lib/auth";
import { savePriceDraft } from "../../lib/offline-store";
import { createSpeechRecognition, extractFirstNumber } from "../../lib/voice";
import { watchUserLocation } from "../../lib/geolocation";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[260px] place-items-center rounded-lg border border-slate-200 bg-field text-sm font-medium text-slate-600">
      Memuat peta pilihan
    </div>
  )
});

type ReportLocation = {
  lat: number;
  lng: number;
};

function sessionContact(session: PetaniSession) {
  return session.user.phone ?? session.user.email ?? session.user.username;
}

function isVerifiedFarmer(session: PetaniSession | null) {
  return session?.user.role === "PETANI" && session.user.verificationStatus === "KTP_VERIFIED";
}

export function PriceInputForm() {
  const [commodities, setCommodities] = useState<string[]>([]);
  const [commodity, setCommodity] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [volumeKg, setVolumeKg] = useState("");
  const [status, setStatus] = useState("Siap kirim");
  const [isRecording, setIsRecording] = useState(false);
  const [browserLocation, setBrowserLocation] = useState<ReportLocation>();
  const [reportLocation, setReportLocation] = useState<ReportLocation>();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationSource, setLocationSource] = useState("Menunggu lokasi");
  const [session, setSession] = useState<PetaniSession | null>(null);
  const hasCustomLocation = useRef(false);

  function updateReportLocation(location: ReportLocation, source: "browser" | "map" | "manual") {
    if (source !== "browser") {
      hasCustomLocation.current = true;
    }

    setReportLocation(location);
    setLatitude(location.lat.toFixed(6));
    setLongitude(location.lng.toFixed(6));
    setLocationSource(
      source === "browser"
        ? "Lokasi browser aktif"
        : source === "map"
          ? "Titik dipilih dari peta"
          : "Titik simulasi manual"
    );
  }

  function updateManualCoordinate(nextLatitude: string, nextLongitude: string) {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);

    const lat = Number(nextLatitude);
    const lng = Number(nextLongitude);
    if (
      nextLatitude.trim() &&
      nextLongitude.trim() &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      updateReportLocation({ lat, lng }, "manual");
    }
  }

  useEffect(() => {
    async function loadCommodities() {
      try {
        const referencePrices = await getReferencePrices();
        const nextCommodities = Array.from(
          new Set(referencePrices.map((item) => String(item.commodity)))
        );
        setCommodities(nextCommodities);
        setCommodity((current) => current || nextCommodities[0] || "");
      } catch {
        setStatus("Komoditas PIHPS belum termuat");
      }
    }

    void loadCommodities();
  }, []);

  useEffect(() => {
    const syncSession = () => setSession(getStoredPetaniSession());
    syncSession();
    window.addEventListener(PETANI_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(PETANI_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    const stopWatching = watchUserLocation(
      (location) => {
        const normalizedLocation: ReportLocation = {
          lat: location.latitude,
          lng: location.longitude,
        };
  
        setBrowserLocation(normalizedLocation);
  
        if (!hasCustomLocation.current) {
          updateReportLocation(normalizedLocation, "browser");
        }
      },
      (error) => {
        setStatus(error.message);
      }
    );
  
    return stopWatching;
  }, []);

  async function submitReport() {
    if (!session) {
      setStatus("Masuk akun dulu");
      return;
    }

    if (!isVerifiedFarmer(session)) {
      setStatus("Akun belum disetujui sebagai petani");
      return;
    }

    if (!reportLocation) {
      setStatus("Pilih titik peta atau isi koordinat");
      return;
    }

    if (!commodity || !pricePerKg || !volumeKg) {
      setStatus("Lengkapi komoditas, harga, dan volume");
      return;
    }

    const payload = {
      commodity,
      pricePerKg: Number(pricePerKg),
      volumeKg: Number(volumeKg),
      district: locationSource === "Lokasi browser aktif" ? "Lokasi saat ini" : "Titik simulasi",
      source: "WEB" as const,
      location: reportLocation
    };

    try {
      const report = await postPriceReport(payload);
      setStatus(
        report.status === "LOW"
          ? "Terkirim: anomali rendah"
          : report.status === "HIGH"
            ? "Terkirim: anomali tinggi"
            : "Terkirim ke API"
      );
      window.dispatchEvent(new Event("price-report-created"));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        clearPetaniSession();
        setSession(null);
        setStatus("Sesi habis, login ulang");
        return;
      }

      if (error instanceof ApiRequestError && error.status === 403) {
        setStatus(error.message);
        return;
      }

      await savePriceDraft({
        id: crypto.randomUUID(),
        ...payload,
        reporterName: session.user.name,
        reporterPhone: sessionContact(session)
      });
      setStatus(error instanceof Error ? error.message : "Tersimpan offline");
    }
  }

  function startVoiceInput() {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setStatus("Voice belum tersedia");
      return;
    }

    setIsRecording(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const detectedPrice = extractFirstNumber(transcript);
      if (detectedPrice) setPricePerKg(String(detectedPrice));
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Input harga petani</h2>
          <p className="mt-1 text-sm text-slate-600">Kirim laporan harga lapangan harian.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {status}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Komoditas
          <select
            className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
            value={commodity}
            onChange={(event) => setCommodity(event.target.value)}
            disabled={commodities.length === 0}
          >
            {commodities.length === 0 ? <option>Memuat PIHPS...</option> : null}
            {commodities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Koordinat laporan
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              inputMode="decimal"
              placeholder="-8.075000"
              value={latitude}
              onChange={(event) => updateManualCoordinate(event.target.value, longitude)}
            />
            <input
              className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              inputMode="decimal"
              placeholder="111.900000"
              value={longitude}
              onChange={(event) => updateManualCoordinate(latitude, event.target.value)}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {locationSource}
          </span>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Harga per kg
          <div className="flex gap-2">
            <input
              className="focus-ring min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2"
              inputMode="numeric"
              value={pricePerKg}
              onChange={(event) => setPricePerKg(event.target.value)}
            />
            <button
              className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-field text-ink"
              type="button"
              aria-label="Isi harga dengan suara"
              title="Isi harga dengan suara"
              onClick={startVoiceInput}
            >
              <Mic size={18} className={isRecording ? "text-chili" : undefined} />
            </button>
          </div>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Volume panen kg
          <input
            className="focus-ring rounded-md border border-slate-200 px-3 py-2"
            inputMode="numeric"
            value={volumeKg}
            onChange={(event) => setVolumeKg(event.target.value)}
          />
        </label>

        <div className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
          Akun pelapor
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {session ? (
              <span>
                {session.user.name} - {sessionContact(session)}
              </span>
            ) : (
              <span>Belum masuk</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin size={17} />
              Pilih titik simulasi
            </span>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              type="button"
              disabled={!browserLocation}
              onClick={() => {
                if (browserLocation) updateReportLocation(browserLocation, "browser");
              }}
            >
              <Crosshair size={16} />
              Pakai lokasi browser
            </button>
          </div>
          <LocationPickerMap
            value={reportLocation}
            onChange={(location) => updateReportLocation(location, "map")}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={!isVerifiedFarmer(session)}
          onClick={submitReport}
        >
          <Send size={17} />
          Kirim harga
        </button>
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          type="button"
          onClick={() => setStatus("Mode offline aktif")}
        >
          <WifiOff size={17} />
          Simpan offline
        </button>
      </div>
    </section>
  );
}
