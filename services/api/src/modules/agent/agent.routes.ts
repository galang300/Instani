/**
 * RAG Agent Routes - Konsultasi Cerdas dengan Context Injection
 */
import { Router, type Request, type Response } from "express";
import { verifyAuthToken } from "../../common/auth.js";
import {
  gatherAgentContext,
  formatContextForLLM,
  callRAGLLM,
  type AgentConsultRequest
} from "./agent.service.js";

export const agentRoutes = Router();

/**
 * POST /agent/consult - Konsultasi RAG dengan injected PIHPS & cuaca
 */
agentRoutes.post("/consult", async (request: Request, response: Response) => {
  try {
    const token = verifyAuthToken(request.headers.authorization);
    const payload = request.body as AgentConsultRequest;

    console.log("Agent consult request:", {
      user_question: payload.user_question,
      province: payload.province,
      city: payload.city_regency
    });

    if (!payload.user_question) {
      console.warn("Missing user_question in request");
      response.status(400).json({ message: "user_question diperlukan" });
      return;
    }

    // Ambil konteks data (PIHPS + Cuaca)
    console.log("Gathering agent context...");
    const context = await gatherAgentContext(payload);
    console.log("Context gathered successfully");

    // Format untuk system prompt LLM
    const systemPrompt = formatContextForLLM(context);
    console.log("System prompt formatted");

    // Call LLM dengan konteks
    console.log("Calling RAG LLM...");
    const llmResponse = await callRAGLLM(payload.user_question, systemPrompt, context);
    console.log("LLM response received");

    response.json({
      question: payload.user_question,
      answer: llmResponse,
      context: {
        weather: context.weather,
        prices: context.prices,
        anomalies: context.anomalies,
        recentReports: context.recentReports,
        reportSummary: context.reportSummary,
        location: `${context.metadata.city}, ${context.metadata.province}`
      },
      timestamp: new Date().toISOString(),
      userId: token?.id ?? "anonymous"
    });
  } catch (error) {
    console.error("Error in agent consult:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    response.status(500).json({
      message: "Gagal memproses konsultasi RAG",
      error: errorMsg,
      details: process.env.NODE_ENV === "development" ? error : undefined
    });
  }
});

/**
 * GET /agent/quick-prompts - Daftar prompt siap pakai untuk frontend
 */
agentRoutes.get("/quick-prompts", (request: Request, response: Response) => {
  const quickPrompts = [
    {
      id: "check-price",
      label: "🏷️ Cek Harga Beras Hari Ini",
      question: "Berapa harga acuan beras hari ini? Apakah naik atau turun?"
    },
    {
      id: "weather-farming",
      label: "🌤️ Prakiraan Cuaca & Aktivitas Tani",
      question: "Apa rekomendasi aktivitas tani berdasarkan cuaca BMKG hari ini?"
    },
    {
      id: "fair-price",
      label: "💰 Berapa Harga Lelang yang Wajar?",
      question: "Bagaimana cara menentukan harga jual wajar untuk hasil tani saya di lelang?"
    },
    {
      id: "price-strategy",
      label: "📊 Strategi Harga Optimal",
      question: "Apa strategi penetapan harga untuk memaksimalkan keuntungan di lelang?"
    },
    {
      id: "weather-alert",
      label: "⚠️ Alert Cuaca Ekstrem",
      question: "Apakah ada peringatan cuaca ekstrem? Apa yang harus saya lakukan?"
    },
    {
      id: "market-trend",
      label: "📈 Tren Harga Pasar",
      question: "Bagaimana tren harga komoditas saya 7 hari terakhir?"
    },
    {
      id: "local-anomalies",
      label: "🚨 Anomali Daerah Saya",
      question: "Sekarang berapa laporan harga anomali yang ada di daerah saya?"
    },
    {
      id: "local-chili-average",
      label: "🌶️ Rata-rata Cabai Lokal",
      question: "Rata-rata pelaporan harga cabai di daerah saya berapa?"
    }
  ];

  response.json({
    prompts: quickPrompts,
    total: quickPrompts.length,
    description: "Gunakan prompt di bawah untuk konsultasi cepat atau tanyakan pertanyaan custom"
  });
});

/**
 * GET /agent/context - Ambil data konteks current (PIHPS + Cuaca)
 */
agentRoutes.get("/context", async (request: Request, response: Response) => {
  try {
    const payload = {
      user_question: "get_context", // Dummy, only for gathering
      province: request.query.province?.toString(),
      city_regency: request.query.city?.toString(),
      latitude: request.query.latitude ? Number(request.query.latitude) : undefined,
      longitude: request.query.longitude ? Number(request.query.longitude) : undefined
    };

    const context = await gatherAgentContext(payload);

    response.json({
      weather: context.weather,
      prices: context.prices,
      anomalies: context.anomalies,
      recentReports: context.recentReports,
      reportSummary: context.reportSummary,
      metadata: context.metadata,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching agent context:", error);
    response.status(500).json({
      message: "Gagal mengambil data konteks",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
