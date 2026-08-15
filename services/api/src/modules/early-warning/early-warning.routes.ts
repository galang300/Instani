import { Router } from "express";
import type { PriceReport } from "@panganterkini/shared-types";
import { hargaRepository } from "../harga/harga.repository.js";

export const earlyWarningRoutes = Router();

earlyWarningRoutes.get("/", async (_request, response) => {
  const warnings: PriceReport[] = await hargaRepository.lowPriceWarnings();
  response.json({
    count: warnings.length,
    warnings: warnings.map((report) => ({
      id: report.id,
      commodity: report.commodity,
      district: report.district,
      pricePerKg: report.pricePerKg,
      zScore: report.zScore,
      message: "Harga rendah. Verifikasi transaksi dan bandingkan dengan HPP petani."
    }))
  });
});
