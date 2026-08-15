/**
 * Enhanced Anomaly Routes dengan PIHPS Time Series Analysis
 */
import { Router } from "express";
import { detectIqr, detectMad, detectZScore } from "../../common/anomaly.js";
import { hargaRepository } from "../harga/harga.repository.js";
import { calculateAnomalySummary } from "../harga/harga.extended.js";
import { anomalyDetectSchema } from "@panganterkini/validation";

export const anomalyRoutes = Router();

/**
 * GET /anomaly/summary - Ringkasan anomali per komoditas dengan analisis time series
 */
anomalyRoutes.get("/summary", async (request, response) => {
  try {
    const commodity = request.query.commodity?.toString() ?? "Gabah Kering Panen";
    const province = request.query.province?.toString();
    const regency = request.query.regency?.toString();

    const summary = await calculateAnomalySummary(commodity);

    // Enhance dengan Z-Score calculation jika ada value
    const value = request.query.value ? Number(request.query.value) : undefined;
    if (value) {
      const zScoreDetail = await hargaRepository.anomalyForCommodity(commodity, value);
      return response.json({
        ...summary,
        userInputAnalysis: zScoreDetail
      });
    }

    response.json(summary);
  } catch (error) {
    console.error("Error calculating anomaly summary:", error);
    response.status(500).json({
      message: "Gagal menghitung ringkasan anomali",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /anomaly/commodities - Daftar semua komoditas dengan anomaly status
 */
anomalyRoutes.get("/commodities", async (request, response) => {
  try {
    const province = request.query.province?.toString();
    const commodities = [
      "Beras Lokal",
      "Beras Premium",
      "Jagung Pipil",
      "Gabah Kering Panen",
      "Kedelai",
      "Singkong",
      "Ubi Jalar"
    ];

    const summaries = await Promise.all(
      commodities.map((c) => calculateAnomalySummary(c))
    );

    // Filter yang ada anomali atau warning
    const filtered = summaries
      .filter((s) => s.status !== "INSUFFICIENT_DATA")
      .sort((a, b) => {
        // Critical pertama
        if (a.riskLevel === "CRITICAL" && b.riskLevel !== "CRITICAL") return -1;
        if (a.riskLevel !== "CRITICAL" && b.riskLevel === "CRITICAL") return 1;
        // Lalu WARNING
        if (a.riskLevel === "WARNING" && b.riskLevel !== "WARNING") return -1;
        if (a.riskLevel !== "WARNING" && b.riskLevel === "WARNING") return 1;
        return 0;
      });

    response.json({
      total: commodities.length,
      analyzed: summaries.length,
      anomalous: filtered.filter((s) => s.isAnomalous).length,
      data: filtered
    });
  } catch (error) {
    console.error("Error fetching commodity anomalies:", error);
    response.status(500).json({
      message: "Gagal mengambil ringkasan anomali komoditas",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /anomaly/detect - Deteksi anomali berdasarkan nilai manual
 */
anomalyRoutes.post("/detect", (request, response) => {
  const parsed = anomalyDetectSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const { values, value } = parsed.data;
  response.json({
    zScore: detectZScore(values, value),
    iqr: detectIqr(values, value),
    mad: detectMad(values, value)
  });
});
