import { priceReportSchema } from "@panganterkini/validation";
import { Router, type Request, type Response } from "express";
import { verifyAuthToken } from "../../common/auth.js";
import { prisma } from "../../database/prisma.js";
import { hargaRepository } from "./harga.repository.js";
import { getWeatherDataCached } from "../weather/weather.service.js";

export const hargaRoutes = Router();

async function verifyAdmin(request: Request, response: Response) {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login admin diperlukan" });
    return null;
  }

  const admin = await prisma.user.findUnique({
    where: { id: token.id },
    select: { id: true, role: true }
  });

  if (admin?.role !== "ADMIN") {
    response.status(403).json({ message: "Akses admin diperlukan" });
    return null;
  }

  return admin;
}

hargaRoutes.get("/reports", async (request, response) => {
  const requestedPeriod = request.query.period?.toString() === "month" ? "month" : "today";
  if (requestedPeriod === "month") {
    const admin = await verifyAdmin(request, response);
    if (!admin) return;
  }

  response.json(
    await hargaRepository.listReports({
      commodity: request.query.commodity?.toString(),
      district: request.query.district?.toString(),
      period: requestedPeriod
    })
  );
});

hargaRoutes.get("/admin/reporting-dashboard", async (request, response) => {
  const admin = await verifyAdmin(request, response);
  if (!admin) return;

  response.json(await hargaRepository.monthlyReportingDashboard());
});

hargaRoutes.post("/reports", async (request, response) => {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login petani diperlukan untuk kirim harga" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { role: true, verificationStatus: true, gapoktan: { select: { district: true } } }
  });

  if (user?.role !== "PETANI" || user.verificationStatus !== "KTP_VERIFIED") {
    response.status(403).json({ message: "Hanya akun petani yang bisa kirim harga" });
    return;
  }

  const parsed = priceReportSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  try {
    const report = await hargaRepository.createReport(parsed.data, {
      reporterId: token.id,
      referenceProvince: "Jawa Timur",
      referenceRegency: user.gapoktan?.district
    });

    response.status(201).json(report);
  } catch (error) {
    console.error("Error creating price report:", error);
    response.status(500).json({ message: "Gagal menyimpan laporan harga" });
  }
});

hargaRoutes.get("/stats", async (_request, response) => {
  response.json(await hargaRepository.dashboardStats());
});

hargaRoutes.get("/reference", async (request, response) => {
  const province = request.query.province?.toString();
  const regency = request.query.regency?.toString();
  const commodity = request.query.commodity?.toString();

  response.json(
    await hargaRepository.referencePrices({
      province,
      regency,
      commodity
    })
  );
});

hargaRoutes.get("/reference/by-location", async (request, response) => {
  const province = request.query.province?.toString();
  const regency = request.query.regency?.toString();
  const commodity = request.query.commodity?.toString();

  response.json(
    await hargaRepository.referencePricesByLocation({
      province,
      regency,
      commodity
    })
  );
});

hargaRoutes.get("/reference/filters", async (request, response) => {
  const province = request.query.province?.toString();

  response.json(await hargaRepository.referenceFilters({ province }));
});

hargaRoutes.post("/reference/sync", async (_request, response) => {
  try {
    const result = await hargaRepository.syncReferencePrices();
    response.json(result);
  } catch (error) {
    response.status(502).json({
      message: "Gagal sinkronisasi harga referensi PIHPS",
      detail: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

hargaRoutes.get("/heatmap", async (_request, response) => {
  response.json(await hargaRepository.heatmap());
});

/**
 * GET /harga/with-weather - Laporan harga + cuaca BMKG terkini
 * Mengambil data harga sesuai lokasi user dengan data cuaca real-time dari BMKG
 */
hargaRoutes.get("/with-weather", async (request, response) => {
  try {
    // Gunakan query parameters dari request, atau ambil dari geolocation
    // Tidak ada default hardcoded - biarkan frontend mengirim lokasi yang benar
    const province = request.query.province?.toString();
    const city = request.query.city?.toString();
    const latitude = request.query.latitude ? Number(request.query.latitude) : undefined;
    const longitude = request.query.longitude ? Number(request.query.longitude) : undefined;

    // Fetch harga dengan filter lokasi jika disediakan
    const hargaData = await hargaRepository.referencePricesByLocation({
      province,
      regency: city
    });

    // Fetch cuaca jika koordinat tersedia
    let weatherData;
    if (latitude !== undefined && longitude !== undefined && city && province) {
      weatherData = await getWeatherDataCached({
        latitude,
        longitude,
        province,
        city
      });
    }

    response.json({
      prices: hargaData,
      weather: weatherData
        ? {
            temperature: weatherData.temperature,
            humidity: weatherData.humidity,
            weatherCondition: weatherData.weatherCondition,
            windSpeed: weatherData.windSpeed,
            recommendation: weatherData.recommendation,
            timestamp: weatherData.timestamp.toISOString(),
            location: `${city}, ${province}`
          }
        : null,
      timestamp: new Date().toISOString(),
      metadata: {
        province: province || "All",
        city: city || "All",
        hasWeather: !!weatherData
      }
    });
  } catch (error) {
    console.error("Error in /with-weather:", error);
    response.status(500).json({
      message: "Gagal mengambil data harga dan cuaca",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
