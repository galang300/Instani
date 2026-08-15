import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./common/config.js";
import { anomalyRoutes } from "./modules/anomaly/anomaly.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { earlyWarningRoutes } from "./modules/early-warning/early-warning.routes.js";
import { eNotaRoutes } from "./modules/e-nota/e-nota.routes.js";
import { gapoktanRoutes } from "./modules/gapoktan/gapoktan.routes.js";
import { groupBuyingRoutes } from "./modules/group-buying/group-buying.routes.js";
import { hargaRoutes } from "./modules/harga/harga.routes.js";
import { hppRoutes } from "./modules/hpp/hpp.routes.js";
import { lelangRoutes } from "./modules/lelang/lelang.routes.js";
import { notificationRoutes } from "./modules/notification/notification.routes.js";
import { ratingRoutes } from "./modules/rating/rating.routes.js";
import { transaksiRoutes } from "./modules/transaksi/transaksi.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.routes.js";
import { agentRoutes } from "./modules/agent/agent.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "6mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/", (_request, response) => {
  response.json({
    name: "PanganTerkini API",
    env: env.nodeEnv,
    modules: [
      "auth",
      "harga",
      "anomaly",
      "early-warning",
      "hpp",
      "lelang",
      "transaksi",
      "rating",
      "e-nota",
      "group-buying",
      "notification",
      "whatsapp",
      "agent"
    ]
  });
});

app.get("/health", (_request, response) => {
  response.json({ ok: true, checkedAt: new Date().toISOString() });
});

app.get("/metrics", (_request, response) => {
  response.type("text/plain").send(
    [
      "# HELP panganterkini_api_up API availability",
      "# TYPE panganterkini_api_up gauge",
      "panganterkini_api_up 1"
    ].join("\n")
  );
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/gapoktan", gapoktanRoutes);
app.use("/api/harga", hargaRoutes);
app.use("/api/anomaly", anomalyRoutes);
app.use("/api/early-warning", earlyWarningRoutes);
app.use("/api/hpp", hppRoutes);
app.use("/api/lelang", lelangRoutes);
app.use("/api/transaksi", transaksiRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/e-nota", eNotaRoutes);
app.use("/api/group-buying", groupBuyingRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/agent", agentRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: "Route tidak ditemukan" });
});

app.listen(env.port, () => {
  console.log(`PanganTerkini API listening on :${env.port}`);
});
