"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { consultAgent, getAgentQuickPrompts } from "../lib/api";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  context?: {
    weather?: any;
    prices?: any[];
    anomalies?: any[];
    recentReports?: any[];
    reportSummary?: {
      scope: "LOCATION" | "ALL_REPORTS_FALLBACK";
      totalReports: number;
      todayReports: number;
      anomalyReports: number;
      lowReports: number;
      highReports: number;
      averagePrice: number | null;
    };
    location?: string;
  };
  timestamp: Date;
}

interface QuickPrompt {
  id: string;
  label: string;
  question: string;
}

interface RAGChatProps {
  userId?: string;
  province?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * RAGChat Component - Chatbot konsultasi pertanian dengan context injection
 */
export function RAGChat({
  userId = "anonymous",
  province = "Jawa Timur",
  city = "Tulungagung",
  latitude = -8.0772,
  longitude = 111.3868
}: RAGChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getAgentQuickPrompts();
        setQuickPrompts(data.prompts || []);
      } catch (error) {
        console.error("Error fetching quick prompts:", error);
      }
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: question,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const data = await consultAgent({
        user_question: question,
        province,
        city_regency: city,
        latitude,
        longitude
      });

      if (!data.answer) {
        throw new Error("Respons AI tidak mengandung jawaban");
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer,
        context: data.context,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("RAG consult error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `❌ Maaf, terjadi kesalahan: ${error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga"}`,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendClick = () => {
    sendMessage(inputValue);
  };

  const handleQuickPromptClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="flex h-[calc(100svh-8rem)] min-h-[600px] flex-col overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50 shadow-xl lg:h-[760px]">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4 text-white shadow-md sm:p-5">
        <h1 className="text-xl font-black sm:text-2xl">🌾 Konsultasi Tani Cerdas</h1>
        <p className="mt-1 text-xs leading-5 text-emerald-100 sm:text-sm">
          Powered by RAG AI + Data PIHPS & Cuaca BMKG Real-time • {city}, {province}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-1 text-center">
            <div className="mb-4 text-5xl sm:text-6xl">🤖</div>
            <h2 className="mb-2 text-xl font-black text-emerald-900 sm:text-2xl">
              Selamat datang di RAG Consult!
            </h2>
            <p className="mb-6 max-w-md text-sm leading-6 text-gray-600">
              Tanyakan tentang harga panen, cuaca bertani, atau strategi lelang. Kami akan memberikan
              rekomendasi berdasarkan data PIHPS terkini dan prakiraan cuaca BMKG resmi.
            </p>

            {quickPrompts.length > 0 && (
              <div className="w-full">
                <p className="mb-3 text-sm font-semibold text-gray-700">
                  💡 Mulai dengan pertanyaan cepat:
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {quickPrompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleQuickPromptClick(prompt.question)}
                      className="focus-ring rounded-md border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:text-sm"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] break-words rounded-lg p-3 sm:max-w-md sm:p-4 lg:max-w-2xl ${
                  message.type === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-900 border-l-4 border-emerald-500"
                }`}
              >
                {message.type === "assistant" ? (
                  <div className="max-w-none text-sm">
                    <ReactMarkdown
                      components={{
                        h2: ({ node, ...props }) => (
                          <h2 className="text-lg font-bold text-emerald-700 mt-3 mb-2" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-base font-bold text-emerald-600 mt-2 mb-1" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-inside space-y-1 text-sm" {...props} />
                        ),
                        li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                        p: ({ node, ...props }) => (
                          <p className="text-sm leading-relaxed mb-2" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold text-emerald-700" {...props} />
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>

                    {message.context && (
                      <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-xs leading-5 text-gray-600">
                        {message.context.weather && (
                          <p>
                            🌤️ <strong>Cuaca:</strong> {message.context.weather.temperature}°C,{" "}
                            {message.context.weather.condition}
                          </p>
                        )}
                        {message.context.location && (
                          <p>
                            📍 <strong>Lokasi:</strong> {message.context.location}
                          </p>
                        )}
                        {message.context.prices && message.context.prices.length > 0 && (
                          <p>
                            💰 <strong>Komoditas:</strong> {message.context.prices.length} harga acuan tersedia
                          </p>
                        )}
                        {message.context.reportSummary && (
                          <p>
                            📊 <strong>Laporan:</strong>{" "}
                            {message.context.reportSummary.scope === "LOCATION"
                              ? ""
                              : "semua lokasi, "}
                            {message.context.reportSummary.totalReports} laporan,{" "}
                            {message.context.reportSummary.anomalyReports} anomali
                            {typeof message.context.reportSummary.averagePrice === "number"
                              ? `, rerata lintas komoditas Rp${message.context.reportSummary.averagePrice.toLocaleString("id-ID")}/kg`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <p className="mt-2 text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg border-l-4 border-emerald-500 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: "0.1s" }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: "0.2s" }}></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">Sedang memproses konsultasi...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-3 shadow-lg sm:p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Tanya tentang harga, cuaca, atau strategi tani..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendClick();
              }
            }}
            disabled={loading}
            className="focus-ring min-h-11 min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
          />
          <button
            onClick={handleSendClick}
            disabled={loading || !inputValue.trim()}
            className="focus-ring inline-flex min-h-11 w-12 items-center justify-center rounded-md bg-leaf text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:px-4"
            aria-label="Kirim pertanyaan"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            <span className="sr-only">Kirim</span>
          </button>
        </div>

        {messages.length > 0 && quickPrompts.length > 0 && (
          <div className="mt-3 text-xs">
            <p className="mb-2 text-gray-600">💡 Atau coba pertanyaan lain:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handleQuickPromptClick(prompt.question)}
                  disabled={loading}
                  className="focus-ring rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
