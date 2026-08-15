/**
 * BMKG Weather Service
 * Integration dengan API BMKG untuk prakiraan cuaca
 */
import { env } from "../../common/config.js";

const BMKG_API_BASE = "https://api.bmkg.go.id/publik";

export interface WeatherData {
  latitude: number;
  longitude: number;
  province: string;
  city: string;
  temperature: number;
  humidity: number;
  weatherCondition:
    | "Cerah"
    | "Cerah Berawan"
    | "Berawan"
    | "Hujan Ringan"
    | "Hujan"
    | "Hujan Petir"
    | "Badai";
  windSpeed: number;
  timestamp: Date;
  recommendation: string;
}

export interface BMKGWeatherResponse {
  data: {
    Tc: number; // Temperature in Celsius
    RH: number; // Relative Humidity
    Cuaca: string; // Weather condition
    Kecepatan_Angin: number;
    Timestamp: string;
  }[];
}

/**
 * Format kondisi cuaca BMKG ke bahasa yang friendly
 */
function formatWeatherCondition(rawCondition: string): WeatherData["weatherCondition"] {
  const condition = rawCondition?.toLowerCase() ?? "";
  if (condition.includes("cerah") && !condition.includes("berawan")) return "Cerah";
  if (condition.includes("cerah berawan") || condition.includes("berawan cerah"))
    return "Cerah Berawan";
  if (condition.includes("berawan")) return "Berawan";
  if (condition.includes("petir") || condition.includes("badai")) return "Hujan Petir";
  if (condition.includes("hujan ringan")) return "Hujan Ringan";
  if (condition.includes("hujan")) return "Hujan";
  return "Cerah Berawan";
}

/**
 * Generate farming recommendation berdasarkan cuaca
 */
export function getFarmingRecommendation(condition: WeatherData["weatherCondition"]): string {
  const recommendations: Record<WeatherData["weatherCondition"], string> = {
    Cerah: "Kondisi ideal untuk pemupukan terbuka & penjemuran gabah. Manfaatkan cuaca cerah untuk aktivitas pertanian maksimal.",
    "Cerah Berawan":
      "Kondisi cukup baik untuk pemupukan & penjemuran. Waspadai potensi hujan sore, tunda jika diperlukan.",
    Berawan:
      "Waktu optimal untuk penyemprotan hama & perawatan tanaman. Hindari pemupukan terbuka, tingkatkan pengawasan tanaman.",
    "Hujan Ringan":
      "Tunda pemupukan terbuka, manfaatkan untuk penyiraman. Perhatikan kondisi lahan, waspadai genangan.",
    Hujan: "Tunda semua aktivitas di lahan. Fokus pada pemeliharaan drainase & pencegahan penyakit akibat kelembapan tinggi.",
    "Hujan Petir":
      "Sangat berbahaya. Evakuasi ke tempat aman, tunda semua pekerjaan lahan. Waspadai banjir & genangan.",
    Badai:
      "Kondisi ekstrem. Amankan peralatan & ternak, hindarkan lahan terbuka. Siapkan drainase darurat."
  };

  return recommendations[condition] || recommendations["Cerah Berawan"];
}

/**
 * Fetch real BMKG weather data from official API
 */
export async function fetchWeatherData(options: {
  latitude: number;
  longitude: number;
  province: string;
  city: string;
}): Promise<WeatherData> {
  try {
    // Use BMKG API with coordinates
    // Format: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=latitude,longitude
    const bmkgUrl = `${BMKG_API_BASE}/prakiraan-cuaca?adm4=${options.latitude},${options.longitude}`;
    
    const response = await fetch(bmkgUrl, {
      headers: {
        "User-Agent": "PanganTerkini/1.0"
      }
    });

    if (!response.ok) {
      console.warn(`BMKG API returned ${response.status}, using fallback`);
      return getFallbackWeatherData(options);
    }

    const data = await response.json() as { data?: { cuaca: Array<{ timestamp: string; value: string; tempC: string; humidity: string; windSpeed: string }> } };
    
    // Parse BMKG response
    if (data?.data?.cuaca && Array.isArray(data.data.cuaca) && data.data.cuaca.length > 0) {
      const latestWeather = data.data.cuaca[0];
      
      const temperature = parseFloat(latestWeather.tempC) || 28;
      const humidity = parseFloat(latestWeather.humidity) || 70;
      const windSpeed = parseFloat(latestWeather.windSpeed) || 5;
      const weatherCondition = formatWeatherCondition(latestWeather.value);

      return {
        latitude: options.latitude,
        longitude: options.longitude,
        province: options.province,
        city: options.city,
        temperature,
        humidity,
        weatherCondition,
        windSpeed,
        timestamp: new Date(latestWeather.timestamp),
        recommendation: getFarmingRecommendation(weatherCondition)
      };
    }

    return getFallbackWeatherData(options);
  } catch (error) {
    console.error("Error fetching BMKG weather data:", error);
    return getFallbackWeatherData(options);
  }
}

/**
 * Fallback weather data when BMKG API is unavailable
 */
function getFallbackWeatherData(options: {
  latitude: number;
  longitude: number;
  province: string;
  city: string;
}): WeatherData {
  return {
    latitude: options.latitude,
    longitude: options.longitude,
    province: options.province,
    city: options.city,
    temperature: 27,
    humidity: 75,
    weatherCondition: "Berawan",
    windSpeed: 8,
    timestamp: new Date(),
    recommendation: "Waktu optimal untuk penyemprotan hama & perawatan tanaman."
  };
}

/**
 * Cache weather data untuk mengurangi API calls
 */
const weatherCache = new Map<
  string,
  { data: WeatherData; expiredAt: number }
>();

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function getWeatherDataCached(options: {
  latitude: number;
  longitude: number;
  province: string;
  city: string;
}): Promise<WeatherData> {
  const cacheKey = `${options.province}-${options.city}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && cached.expiredAt > Date.now()) {
    return cached.data;
  }

  const freshData = await fetchWeatherData(options);
  weatherCache.set(cacheKey, {
    data: freshData,
    expiredAt: Date.now() + CACHE_DURATION_MS
  });

  return freshData;
}
