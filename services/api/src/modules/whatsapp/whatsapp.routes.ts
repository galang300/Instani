import { Router } from "express";
import { hargaRepository } from "../harga/harga.repository.js";

export const whatsappRoutes = Router();

whatsappRoutes.post("/webhook", async (request, response) => {
  const text = String(request.body.text ?? request.body.message ?? "").toLowerCase();
  const number = text.replace(/\./g, "").match(/\d+/)?.[0];
  const price = number ? Number(number) : null;

  if (!price) {
    response.json({
      reply: "Format: HARGA <komoditas> <harga per kg> <volume kg> <kecamatan>"
    });
    return;
  }

  const commodity = text.includes("beras")
    ? "Beras Medium"
    : text.includes("cabai")
      ? "Cabai Rawit"
      : text.includes("jagung")
        ? "Jagung Pipilan"
        : "Gabah Kering Panen";

  const report = await hargaRepository.createReport({
    commodity,
    pricePerKg: price,
    volumeKg: 100,
    district: "Ngantru",
    reporterName: request.body.from ?? "WhatsApp User",
    reporterPhone: request.body.phone,
    source: "WHATSAPP",
    location: { lat: -7.9532, lng: 111.9032 }
  });

  response.json({
    reply: `Harga ${report.commodity} Rp${report.pricePerKg.toLocaleString("id-ID")}/kg masuk. Status ${report.status}.`,
    report
  });
});
