import { Router } from "express";
import { randomUUID } from "node:crypto";

export const eNotaRoutes = Router();

eNotaRoutes.post("/", (request, response) => {
  response.status(201).json({
    id: randomUUID(),
    transactionId: request.body.transactionId ?? "trx-demo-001",
    pdfUrl: null,
    whatsappSent: false,
    createdAt: new Date().toISOString()
  });
});
