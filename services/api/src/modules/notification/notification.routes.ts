import { Router } from "express";

export const notificationRoutes = Router();

notificationRoutes.post("/broadcast", (request, response) => {
  response.status(202).json({
    accepted: true,
    channel: request.body.channel ?? "WHATSAPP",
    target: request.body.target ?? "gapoktan",
    queuedAt: new Date().toISOString()
  });
});
