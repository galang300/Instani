"use client";

import type { ReferencePrice } from "@panganterkini/shared-types";
import {
  Database,
  MapPin,
  RefreshCw,
  LocateFixed
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getReferencePriceFilters,
  getReferencePrices
} from "../../lib/api";

import {
  detectUserLocation,
  GeolocationRequestError
} from "../../lib/geolocation";

const preferredCommodities = [
  "Beras",
  "Beras Kualitas Medium I",
  "Cabai Rawit",
  "Cabai Rawit Merah",
  "Bawang Merah",
  "Telur Ayam",
  "Gula Pasir",
  "Minyak Goreng"
];

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function sortReferencePrices(
  items: ReferencePrice[]
) {
  return [...items].sort((a, b) => {
    const aIndex = preferredCommodities.indexOf(
      String(a.commodity)
    );

    const bIndex = preferredCommodities.indexOf(
      String(b.commodity)
    );

    const normalizedA =
      aIndex === -1
        ? Number.MAX_SAFE_INTEGER
        : aIndex;

    const normalizedB =
      bIndex === -1
        ? Number.MAX_SAFE_INTEGER
        : bIndex;

    if (normalizedA !== normalizedB) {
      return normalizedA - normalizedB;
    }

    return String(a.commodity).localeCompare(
      String(b.commodity),
      "id-ID"
    );
  });
}

export function ReferencePricePanel() {
  const [prices, setPrices] = useState<
    ReferencePrice[]
  >([]);

  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  /**
   * Filter harga.
   *
   * Nilai ini berasal dari database/API,
   * bukan hard-code lokasi.
   */
  const [selectedProvince, setSelectedProvince] =
    useState("");

  const [selectedRegency, setSelectedRegency] =
    useState("");

  const [selectedCommodity, setSelectedCommodity] =
    useState("");

  /**
   * Options dropdown berasal dari database/API.
   */
  const [provinceOptions, setProvinceOptions] =
    useState<string[]>([]);

  const [regencyOptions, setRegencyOptions] =
    useState<string[]>([]);

  const [commodityOptions, setCommodityOptions] =
    useState<string[]>([]);

  /**
   * Informasi lokasi GPS asli.
   */
  const [locationHint, setLocationHint] =
    useState<string | null>(null);

  const [geoStatus, setGeoStatus] =
    useState<string | null>(null);

  const [isDetectingLocation, setIsDetectingLocation] =
    useState(false);

  /**
   * =====================================================
   * LOAD FILTER AWAL
   * =====================================================
   *
   * Provinsi, kabupaten dan komoditas
   * diambil dari backend/database.
   */
  const loadInitialFilters = useCallback(
    async () => {
      try {
        const filters =
          await getReferencePriceFilters();

        setProvinceOptions(
          filters.provinces ?? []
        );

        setCommodityOptions(
          filters.commodities ?? []
        );

        setRegencyOptions(
          filters.regencies ?? []
        );
      } catch (error) {
        console.error(
          "Gagal mengambil filter harga:",
          error
        );

        setGeoStatus(
          "Filter wilayah belum bisa dimuat dari database."
        );
      }
    },
    []
  );

  useEffect(() => {
    void loadInitialFilters();
  }, [loadInitialFilters]);

  /**
   * =====================================================
   * DETEKSI LOKASI GPS
   * =====================================================
   */
  const detectLocation = useCallback(
    async () => {
      setIsDetectingLocation(true);

      setGeoStatus(
        "Mendeteksi lokasi perangkat..."
      );

      try {
        const location =
          await detectUserLocation();

        console.log(
          "Detected location:",
          location
        );

        /**
         * Pastikan benar-benar berasal dari GPS.
         */
        if (location.source !== "gps") {
          setGeoStatus(
            "Lokasi GPS tidak tersedia."
          );

          return;
        }

        /**
         * Tampilkan koordinat asli.
         */
        setLocationHint(
          location.city && location.province
            ? `${location.city}, ${location.province}`
            : `${location.latitude.toFixed(
                6
              )}, ${location.longitude.toFixed(6)}`
        );

        /**
         * Kalau reverse geocoding berhasil,
         * gunakan provinsi tersebut sebagai filter.
         */
        if (location.province) {
          setSelectedProvince(
            location.province
          );

          /**
           * Jangan langsung mengisi regency
           * sebelum kita tahu apakah nama tersebut
           * benar-benar tersedia di database.
           */
          setSelectedRegency("");
        }

        setGeoStatus(
          location.province
            ? "Lokasi GPS berhasil dideteksi."
            : "Koordinat GPS berhasil dideteksi, tetapi wilayah belum ditemukan."
        );
      } catch (error) {
        console.error(
          "Gagal mendeteksi lokasi:",
          error
        );

        const message =
          error instanceof GeolocationRequestError
            ? error.message
            : "Geolocation tidak tersedia.";

        setGeoStatus(message);
      } finally {
        setIsDetectingLocation(false);
      }
    },
    []
  );

  /**
   * Deteksi lokasi ketika component pertama kali
   * dibuka.
   */
  useEffect(() => {
    void detectLocation();
  }, [detectLocation]);

  /**
   * =====================================================
   * LOAD KABUPATEN BERDASARKAN PROVINSI
   * =====================================================
   */
  useEffect(() => {
    void (async () => {
      try {
        const filters =
          await getReferencePriceFilters(
            selectedProvince
              ? {
                  province:
                    selectedProvince
                }
              : undefined
          );

        setRegencyOptions(
          filters.regencies ?? []
        );

        /**
         * Kalau kabupaten yang sebelumnya dipilih
         * tidak ada di provinsi baru,
         * kosongkan pilihan.
         */
        setSelectedRegency((current) => {
          if (
            current &&
            !filters.regencies.includes(current)
          ) {
            return "";
          }

          return current;
        });
      } catch (error) {
        console.error(
          "Gagal mengambil daftar kabupaten:",
          error
        );
      }
    })();
  }, [selectedProvince]);

  /**
   * =====================================================
   * LOAD HARGA
   * =====================================================
   */
  const loadPrices = useCallback(
    async () => {
      setStatus("loading");

      try {
        console.log(
          "Loading prices with filters:",
          {
            province:
              selectedProvince || undefined,

            regency:
              selectedRegency || undefined,

            commodity:
              selectedCommodity || undefined
          }
        );

        const referencePrices =
          await getReferencePrices({
            province:
              selectedProvince || undefined,

            regency:
              selectedRegency || undefined,

            commodity:
              selectedCommodity || undefined
          });

        console.log(
          "Reference prices:",
          referencePrices
        );

        setPrices(
          referencePrices ?? []
        );

        setStatus("ready");
      } catch (error) {
        console.error(
          "Gagal mengambil harga referensi:",
          error
        );

        setPrices([]);
        setStatus("error");
      }
    },
    [
      selectedProvince,
      selectedRegency,
      selectedCommodity
    ]
  );

  /**
   * Reload harga ketika filter berubah.
   */
  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  /**
   * =====================================================
   * SORT DATA
   * =====================================================
   */
  const visiblePrices = useMemo(
    () =>
      sortReferencePrices(prices),
    [prices]
  );

  /**
   * =====================================================
   * TANGGAL DATA TERBARU
   * =====================================================
   */
  const latestSampledAt = useMemo(() => {
    const dates = prices
      .map((item) => item.sampledAt)
      .filter(Boolean)
      .sort();

    return dates.at(-1);
  }, [prices]);

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-3 shadow-soft sm:p-4">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">
            Harga referensi BAPANAS / PIHPS
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            {selectedProvince ||
              "Semua provinsi"}

            {" - "}

            {selectedRegency ||
              "Semua wilayah"}

            {" • "}

            {latestSampledAt
              ? formatDate(
                  latestSampledAt
                )
              : "memuat data"}
          </p>

          {/* =============================== */}
          {/* LOKASI GPS */}
          {/* =============================== */}

          {locationHint ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <MapPin size={12} />

              Lokasi terdeteksi:
              {" "}
              {locationHint}
            </p>
          ) : null}

          {geoStatus ? (
            <p className="mt-1 text-xs text-slate-500">
              {geoStatus}
            </p>
          ) : null}
        </div>

        {/* ================================================= */}
        {/* BUTTON */}
        {/* ================================================= */}

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 sm:py-1"
            type="button"
            disabled={isDetectingLocation}
            onClick={() =>
              void detectLocation()
            }
          >
            {isDetectingLocation ? (
              <RefreshCw
                size={14}
                className="animate-spin"
              />
            ) : (
              <LocateFixed size={14} />
            )}

            Lokasi Saya
          </button>

          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-water/20 bg-sky-50 px-3 py-2 text-xs font-semibold text-water sm:py-1"
            type="button"
            disabled={status === "loading"}
            onClick={() =>
              void loadPrices()
            }
          >
            {status === "loading" ? (
              <RefreshCw
                size={14}
                className="animate-spin"
              />
            ) : (
              <Database size={14} />
            )}

            Refresh
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* FILTER */}
      {/* ================================================= */}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {/* PROVINSI */}

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-normal text-slate-500">
          Provinsi

          <select
            value={selectedProvince}
            onChange={(event) => {
              setSelectedProvince(
                event.target.value
              );

              setSelectedRegency("");
            }}
            className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-sky-500"
          >
            <option value="">
              Semua provinsi
            </option>

            {provinceOptions.map(
              (province) => (
                <option
                  key={province}
                  value={province}
                >
                  {province}
                </option>
              )
            )}
          </select>
        </label>

        {/* KABUPATEN */}

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-normal text-slate-500">
          Wilayah / Kabupaten

          <select
            value={selectedRegency}
            onChange={(event) =>
              setSelectedRegency(
                event.target.value
              )
            }
            disabled={
              !selectedProvince
            }
            className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              Semua wilayah
            </option>

            {regencyOptions.map(
              (regency) => (
                <option
                  key={regency}
                  value={regency}
                >
                  {regency}
                </option>
              )
            )}
          </select>
        </label>

        {/* KOMODITAS */}

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-normal text-slate-500">
          Komoditas

          <select
            value={selectedCommodity}
            onChange={(event) =>
              setSelectedCommodity(
                event.target.value
              )
            }
            className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-sky-500"
          >
            <option value="">
              Semua komoditas
            </option>

            {commodityOptions.map(
              (commodity) => (
                <option
                  key={commodity}
                  value={commodity}
                >
                  {commodity}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      {/* ================================================= */}
      {/* DATA HARGA */}
      {/* ================================================= */}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[1.35fr_0.75fr_0.8fr_0.8fr] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500 sm:grid">
          <span>
            Komoditas
          </span>

          <span className="text-right">
            Provinsi
          </span>

          <span className="text-right">
            Harga/kg
          </span>

          <span className="text-right">
            Sumber
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {/* ERROR */}

          {status === "error" ? (
            <p className="px-3 py-4 text-sm font-medium text-red-700">
              Data referensi belum bisa
              dimuat.
            </p>
          ) : null}

          {/* LOADING */}

          {status === "loading" ? (
            <p className="px-3 py-4 text-sm font-medium text-slate-600">
              Memuat data harga...
            </p>
          ) : null}

          {/* EMPTY */}

          {status === "ready" &&
          visiblePrices.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                Tidak ada data harga untuk
                wilayah/filter tersebut.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Coba pilih provinsi,
                kabupaten, atau komoditas
                lainnya.
              </p>
            </div>
          ) : null}

          {/* DATA */}

          {status === "ready" &&
          visiblePrices.length > 0
            ? visiblePrices.map(
                (item) => (
                  <article
                    key={`${item.id}-${item.province}-${item.regency}`}
                    className="grid gap-2 px-3 py-3 text-sm sm:min-h-12 sm:grid-cols-[1.35fr_0.75fr_0.8fr_0.8fr] sm:items-center sm:gap-3 sm:py-2"
                  >
                    <span className="font-semibold text-ink">
                      {item.commodity}
                    </span>

                    <span className="flex items-center justify-between gap-3 text-slate-600 sm:block sm:text-right">
                      <span className="text-xs font-semibold uppercase text-slate-400 sm:hidden">
                        Provinsi
                      </span>
                      {item.province ||
                        "-"}
                    </span>

                    <span className="flex items-center justify-between gap-3 font-semibold text-ink sm:block sm:text-right">
                      <span className="text-xs font-semibold uppercase text-slate-400 sm:hidden">
                        Harga/kg
                      </span>
                      {formatRupiah(
                        item.pricePerKg
                      )}
                    </span>

                    <span className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-700 sm:block sm:text-right">
                      <span className="text-xs font-semibold uppercase text-slate-400 sm:hidden">
                        Sumber
                      </span>
                      {item.source}
                    </span>
                  </article>
                )
              )
            : null}
        </div>
      </div>
    </section>
  );
}
