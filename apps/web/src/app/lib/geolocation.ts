export type DetectedLocation = {
  latitude: number;
  longitude: number;
  province: string;
  city: string;
  source: "gps" | "default";
};

export type GeolocationErrorCode =
  | "unsupported"
  | "insecure"
  | "denied"
  | "unavailable"
  | "timeout";

export class GeolocationRequestError extends Error {
  code: GeolocationErrorCode;

  constructor(
    code: GeolocationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GeolocationRequestError";
    this.code = code;

    Object.setPrototypeOf(
      this,
      GeolocationRequestError.prototype
    );
  }
};

/**
 * Tidak menggunakan lokasi dummy.
 *
 * Jika GPS gagal, province dan city tetap kosong.
 */
const DEFAULT_LOCATION: DetectedLocation = {
  latitude: 0,
  longitude: 0,
  province: "",
  city: "",
  source: "default"
};

export function isGeolocationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "geolocation" in navigator
  );
}

export function isSecureContextForGeolocation(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext
  );
}

function mapGeolocationError(
  error: GeolocationPositionError
): GeolocationRequestError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new GeolocationRequestError(
        "denied",
        "Izin lokasi ditolak. Aktifkan izin lokasi di browser."
      );

    case error.POSITION_UNAVAILABLE:
      return new GeolocationRequestError(
        "unavailable",
        "Lokasi perangkat tidak tersedia."
      );

    case error.TIMEOUT:
      return new GeolocationRequestError(
        "timeout",
        "Permintaan lokasi habis waktu. Coba lagi."
      );

    default:
      return new GeolocationRequestError(
        "unavailable",
        "Gagal membaca lokasi perangkat."
      );
  }
}

function normalizeProvinceName(
  value: string
): string {
  return value
    .replace(/^Provinsi\s+/i, "")
    .replace(/^Daerah\s+/i, "")
    .trim();
}

function normalizeCityName(
  value: string
): string {
  return value
    .replace(/^Kabupaten\s+/i, "")
    .replace(/^Kab\.\s*/i, "")
    .replace(/^Kota\s+/i, "")
    .trim();
}

/**
 * GPS coordinates
 *       ↓
 * Nominatim OpenStreetMap
 *       ↓
 * province + city/regency
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{
  province: string;
  city: string;
}> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}` +
    `&format=json` +
    `&addressdetails=1` +
    `&accept-language=id` +
    `&zoom=10`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Reverse geocode failed: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      address?: Record<
        string,
        string | undefined
      >;
    };

    const address = data.address ?? {};

    const province = normalizeProvinceName(
      address.state ||
        address.region ||
        ""
    );

    let city = "";

    if (address.city) {
      city = normalizeCityName(
        address.city
      );
    } else if (address.county) {
      city = normalizeCityName(
        address.county
      );
    } else if (address.state_district) {
      city = normalizeCityName(
        address.state_district
      );
    } else if (address.town) {
      city = normalizeCityName(
        address.town
      );
    } else if (address.municipality) {
      city = normalizeCityName(
        address.municipality
      );
    }

    console.log(
      "Nominatim address:",
      address
    );

    console.log(
      "Detected province:",
      province
    );

    console.log(
      "Detected city/regency:",
      city
    );

    return {
      province,
      city
    };
  } catch (error) {
    console.error(
      "Reverse geocoding failed:",
      error
    );

    /**
     * Jangan menggunakan data dummy.
     */
    return {
      province: "",
      city: ""
    };
  }
}

/**
 * Mendapatkan lokasi asli pengguna.
 */
export async function detectUserLocation(
  options?: {
    fallback?: DetectedLocation;
  }
): Promise<DetectedLocation> {
  const fallback =
    options?.fallback ?? DEFAULT_LOCATION;

  if (!isGeolocationSupported()) {
    return {
      ...fallback,
      source: "default"
    };
  }

  if (!isSecureContextForGeolocation()) {
    throw new GeolocationRequestError(
      "insecure",
      "Geolocation hanya aktif di HTTPS atau localhost."
    );
  }

  const position =
    await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 60000
          }
        );
      }
    ).catch(
      (
        error: GeolocationPositionError
      ) => {
        throw mapGeolocationError(error);
      }
    );

  const {
    latitude,
    longitude
  } = position.coords;

  console.log(
    "GPS:",
    {
      latitude,
      longitude
    }
  );

  const {
    province,
    city
  } = await reverseGeocode(
    latitude,
    longitude
  );

  return {
    latitude,
    longitude,
    province,
    city,
    source: "gps"
  };
}

/**
 * Memantau perubahan posisi GPS.
 */
export function watchUserLocation(
  onUpdate: (
    location: Pick<
      DetectedLocation,
      "latitude" | "longitude"
    >
  ) => void,

  onError?: (
    error: GeolocationRequestError
  ) => void
) {
  if (!isGeolocationSupported()) {
    onError?.(
      new GeolocationRequestError(
        "unsupported",
        "Browser belum mendukung geolocation."
      )
    );

    return () => undefined;
  }

  if (!isSecureContextForGeolocation()) {
    onError?.(
      new GeolocationRequestError(
        "insecure",
        "Geolocation hanya aktif di HTTPS atau localhost."
      )
    );

    return () => undefined;
  }

  const watchId =
    navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude
        });
      },

      (error) => {
        onError?.(
          mapGeolocationError(error)
        );
      },

      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000
      }
    );

  return () => {
    navigator.geolocation.clearWatch(
      watchId
    );
  };
}