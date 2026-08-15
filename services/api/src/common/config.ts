import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  scraperUrl: process.env.SCRAPER_URL ?? "http://localhost:5000",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "mock",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@panganterkini.local",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin12345",
  adminName: process.env.ADMIN_NAME ?? "Admin Pengelola",
  llmApiKey: process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  llmFallbackEnabled: (process.env.LLM_FALLBACK_ENABLED ?? "true").toLowerCase() !== "false"
};
