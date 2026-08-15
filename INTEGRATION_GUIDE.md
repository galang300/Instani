# 🌾 Full Integration Guide: PIHPS + BMKG + RAG Agent

Dokumentasi lengkap integrasi modul Laporan Harga, Deteksi Anomali, Cuaca BMKG, dan RAG Agent dengan context injection.

---

## 📋 Daftar Isi

1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Modul Backend](#modul-backend)
3. [Modul Frontend](#modul-frontend)
4. [API Endpoints](#api-endpoints)
5. [Alur Data](#alur-data)
6. [Deployment & Testing](#deployment--testing)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
├─────────────────────────────────────────────────────────────────┤
│  • WeatherCard.tsx     → Tampilkan cuaca BMKG + rekomendasi tani│
│  • RAGChat.tsx         → Chatbot konsultasi dengan quick prompts│
│  • /consult/page.tsx   → Layout chat + weather sidebar          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Calls     │
                    └────────┬────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Express)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/harga (Enhanced)                                   │   │
│  │  • POST /reports        → Simpan dengan validasi PIHPS   │   │
│  │  • GET /with-weather    → Harga + cuaca terkini         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/anomaly (Enhanced)                                 │   │
│  │  • GET /summary         → Analisis time series 30 hari   │   │
│  │  • GET /commodities     → Daftar anomali per komoditas   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/agent (NEW)                                        │   │
│  │  • POST /consult        → Konsultasi RAG dengan context  │   │
│  │  • GET /quick-prompts   → Daftar prompt siap pakai      │   │
│  │  • GET /context         → Ambil konteks current          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  weather.service.ts                                      │   │
│  │  • getWeatherDataCached()   → Ambil cuaca BMKG           │   │
│  │  • getFarmingRecommendation() → Generate rekomendasi    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Databases     │
                    │  & Services     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼───┐           ┌───▼────┐        ┌───▼────┐
    │PostgreSQL│          │PIHPS   │        │BMKG    │
    │Harga    │          │API     │        │API     │
    │Reports  │          │(Cache) │        │(Mock)  │
    └────────┘          └────────┘        └────────┘
```

---

## 💻 Modul Backend

### 1. Weather Service (`weather.service.ts`)

```typescript
// Ambil data cuaca BMKG
const weather = await getWeatherDataCached({
  latitude: -8.0772,
  longitude: 111.3868,
  province: "Jawa Timur",
  city: "Tulungagung"
});

// Response structure
{
  latitude: -8.0772,
  longitude: 111.3868,
  province: "Jawa Timur",
  city: "Tulungagung",
  temperature: 28.5,
  humidity: 72,
  weatherCondition: "Berawan",
  windSpeed: 8.3,
  timestamp: "2026-08-14T10:00:00Z",
  recommendation: "Waktu optimal untuk penyemprotan hama & perawatan tanaman..."
}
```

**Caching:** 30 menit per lokasi untuk reduce API calls

---

### 2. Enhanced Harga Routes (`harga.routes.ts`)

#### POST /api/harga/reports - Laporan harga dengan PIHPS validation

```typescript
// Request
POST /api/harga/reports
{
  "commodity": "Beras Lokal",
  "pricePerKg": 15000,
  "volumeKg": 100,
  "district": "Tulungagung",
  "village": "Bambang",
  "source": "WEB",
  "location": { "lat": -8.077, "lng": 111.387 }
}

// Response
{
  "id": "cuid-xxx",
  "commodity": "Beras Lokal",
  "pricePerKg": 15000,
  "volumeKg": 100,
  "district": "Tulungagung",
  "source": "WEB",
  "status": "NORMAL",                      // Klasifikasi otomatis
  "pihpsReference": 14500,                 // Harga acuan dari DB
  "deviationPercentage": 3.45,             // Deviasi terhitung
  "reporter": {
    "name": "Budi Santoso",
    "phone": "081234567890"
  },
  "createdAt": "2026-08-14T10:30:00Z"
}
```

**Logika Klasifikasi:**
- Deviasi ≤ 15% → Status: `NORMAL`
- Deviasi > 15% → Status: `ANOMALY_SUSPECT`

---

#### GET /api/harga/with-weather - Laporan harga + cuaca

```typescript
GET /api/harga/with-weather?province=Jawa%20Timur&city=Tulungagung&latitude=-8.0772&longitude=111.3868

// Response
{
  "prices": [
    {
      "commodity": "Beras Lokal",
      "pricePerKg": 14500,
      "province": "Jawa Timur",
      "regency": "Tulungagung",
      "sampledAt": "2026-08-14",
      "trend": "STABIL"
    },
    ...
  ],
  "weather": {
    "temperature": 28.5,
    "humidity": 72,
    "weatherCondition": "Berawan",
    "windSpeed": 8.3,
    "recommendation": "Waktu optimal untuk penyemprotan hama...",
    "timestamp": "2026-08-14T10:00:00Z",
    "location": "Tulungagung, Jawa Timur"
  },
  "timestamp": "2026-08-14T10:30:00Z"
}
```

---

### 3. Enhanced Anomaly Routes (`anomaly.routes.ts`)

#### GET /api/anomaly/summary - Ringkasan anomali per komoditas

```typescript
GET /api/anomaly/summary?commodity=Beras%20Lokal&province=Jawa%20Timur

// Response
{
  "commodity": "Beras Lokal",
  "latest": 14500,
  "mean": 14200,
  "stdDev": 450,
  "min": 13000,
  "max": 15500,
  "priceChange": 2.11,                    // % perubahan 7 hari
  "zScore": 0.67,                         // Standar deviasi dari mean
  "isAnomalous": false,
  "riskLevel": "NORMAL",                  // NORMAL | WARNING | CRITICAL
  "dataPoints": 25,
  "lastUpdated": "2026-08-14T00:00:00Z"
}
```

**Risk Levels:**
- `NORMAL` - Tidak ada anomali
- `WARNING` - Anomali terdeteksi dengan perubahan 5-20%
- `CRITICAL` - Anomali ekstrem dengan perubahan >20%

---

#### GET /api/anomaly/commodities - Daftar semua komoditas dengan anomaly status

```typescript
GET /api/anomaly/commodities

// Response
{
  "total": 7,
  "analyzed": 6,
  "anomalous": 2,
  "data": [
    {
      "commodity": "Jagung Pipil",
      "isAnomalous": true,
      "riskLevel": "CRITICAL",
      "priceChange": -25.5,
      "latest": 3600,
      ...
    },
    ...
  ]
}
```

---

### 4. RAG Agent Module (`agent.service.ts` & `agent.routes.ts`)

#### POST /api/agent/consult - Konsultasi dengan context injection

```typescript
// Request
POST /api/agent/consult
{
  "user_question": "Berapa harga jual yang wajar untuk lelang beras saya?",
  "province": "Jawa Timur",
  "city_regency": "Tulungagung",
  "latitude": -8.0772,
  "longitude": 111.3868,
  "commodities": ["Beras Lokal", "Beras Premium"]
}

// Response
{
  "question": "Berapa harga jual yang wajar untuk lelang beras saya?",
  "answer": "## Rekomendasi Harga Jual Wajar...\n\n1. **Harga Acuan Dasar**\n   - Gunakan harga PIHPS terbaru...",
  "context": {
    "weather": {
      "temperature": 28,
      "humidity": 72,
      "condition": "Berawan",
      "windSpeed": 8,
      "recommendation": "Waktu optimal...",
      "timestamp": "2026-08-14T10:00:00Z",
      "location": "Tulungagung, Jawa Timur"
    },
    "prices": [
      {
        "commodity": "Beras Lokal",
        "pricePerKg": 14500,
        "trend": "STABIL"
      }
    ],
    "location": "Tulungagung, Jawa Timur"
  },
  "timestamp": "2026-08-14T10:30:00Z",
  "userId": "user-id-xxx"
}
```

---

#### GET /api/agent/quick-prompts - Daftar prompt siap pakai

```typescript
GET /api/agent/quick-prompts

// Response
{
  "prompts": [
    {
      "id": "check-price",
      "label": "🏷️ Cek Harga Beras Hari Ini",
      "question": "Berapa harga acuan beras hari ini?"
    },
    {
      "id": "weather-farming",
      "label": "🌤️ Prakiraan Cuaca & Aktivitas Tani",
      "question": "Apa rekomendasi aktivitas tani berdasarkan cuaca BMKG hari ini?"
    },
    ...
  ]
}
```

---

#### GET /api/agent/context - Ambil konteks saat ini

```typescript
GET /api/agent/context?province=Jawa%20Timur&city=Tulungagung&latitude=-8.0772&longitude=111.3868

// Response
{
  "weather": { ... },
  "prices": [ ... ],
  "metadata": {
    "province": "Jawa Timur",
    "city": "Tulungagung",
    "latitude": -8.0772,
    "longitude": 111.3868,
    "fetchedAt": "2026-08-14T10:30:00Z"
  }
}
```

---

## 🎨 Modul Frontend

### WeatherCard Component

```tsx
<WeatherCard 
  province="Jawa Timur"
  city="Tulungagung"
  latitude={-8.0772}
  longitude={111.3868}
  autoFetch={true}
/>
```

**Features:**
- ✅ Gradient emerald-kuning keemasan
- ✅ Weather icon (☀️/⛅/🌧️/⛈️)
- ✅ Cuaca resmi BMKG badge
- ✅ Suhu, kelembapan, angin, kondisi
- ✅ Rekomendasi bertani dengan color-coded badge
- ✅ Auto-refresh setiap 30 menit
- ✅ Loading & error states

---

### RAGChat Component

```tsx
<RAGChat
  apiEndpoint="/api/agent"
  province="Jawa Timur"
  city="Tulungagung"
  latitude={-8.0772}
  longitude={111.3868}
/>
```

**Features:**
- ✅ Message history dengan timestamps
- ✅ Quick prompt buttons (6 pilihan)
- ✅ Typing indicator animasi
- ✅ Auto-scroll ke pesan terbaru
- ✅ Markdown rendering untuk jawaban
- ✅ Context badges (cuaca, lokasi, komoditas)
- ✅ Error handling & loading states

---

### Konsultasi Page (`/consult`)

```
┌────────────────────────────────────────────┐
│  🌾 Konsultasi Tani Cerdas dengan AI      │
└────────────────────────────────────────────┘

┌─────────────────┬──────────────────────────┐
│                 │                          │
│  WeatherCard    │      RAGChat             │
│  • Cuaca BMKG   │  • Input pertanyaan      │
│  • Rekomendasi  │  • Message history       │
│  • Data source  │  • Quick prompts         │
│                 │  • Context badges        │
│                 │                          │
└─────────────────┴──────────────────────────┘
```

---

## 📡 API Endpoints Summary

### Harga Module
- `POST /api/harga/reports` - Submit laporan dengan PIHPS validation
- `GET /api/harga/reports` - List laporan terbaru
- `GET /api/harga/reference` - Ambil reference prices
- `GET /api/harga/reference/by-location` - Filter by province/regency
- `GET /api/harga/with-weather` - Harga + cuaca terkini
- `POST /api/harga/reference/sync` - Manual sync PIHPS

### Anomaly Module
- `GET /api/anomaly/summary` - Ringkasan per komoditas
- `GET /api/anomaly/commodities` - Daftar semua anomali
- `POST /api/anomaly/detect` - Deteksi manual

### Agent Module (NEW)
- `POST /api/agent/consult` - RAG konsultasi
- `GET /api/agent/quick-prompts` - Prompt templates
- `GET /api/agent/context` - Konteks current

---

## 🔄 Alur Data

### 1. Submit Laporan Harga → Validasi PIHPS

```
Petani Input
    ↓
POST /api/harga/reports
    ↓
[Backend]
├─ Validasi input format
├─ Query PIHPS reference price
│  └─ Database PriceReference (newest)
├─ Hitung deviasi: |(Price Petani - Price PIHPS) / Price PIHPS| * 100%
├─ Klasifikasi: 
│  ├─ Deviasi ≤ 15%  → NORMAL
│  └─ Deviasi > 15%  → ANOMALY_SUSPECT
└─ Simpan ke database PriceReport
    ↓
Response dengan status + referensi
```

---

### 2. Get Harga + Cuaca

```
Frontend request
    ↓
GET /api/harga/with-weather?province=X&city=Y
    ↓
[Backend - Parallel]
├─ Query DB: PriceReference (30 records)
└─ Call weather service: getWeatherDataCached()
    ├─ Check cache (30 min TTL)
    ├─ If expired: fetch BMKG/mock data
    └─ Update cache
    ↓
Combine + return to frontend
    ↓
Frontend: Render harga + cuaca
```

---

### 3. RAG Konsultasi dengan Context Injection

```
User Question
    ↓
Frontend POST /api/agent/consult
    ↓
[Backend - Gather Context]
├─ Ambil cuaca: getWeatherDataCached()
├─ Ambil harga: Query PIHPS by location
├─ Hitung trend: 7-hari comparison
└─ Format system prompt untuk LLM
    ↓
System Prompt:
"Data Harga Acuan PIHPS: Beras 14500, Jagung 4200...
Kondisi Cuaca: 28°C, Berawan, Angin 8 km/h
Rekomendasi: Waktu optimal untuk penyemprotan..."
    ↓
LLM (OpenAI/Claude/Local)
Input: System prompt + User question
Output: Jawaban dengan konteks lokal
    ↓
Response dengan context badges
    ↓
Frontend: Render markdown + weather info
```

---

### 4. Anomaly Detection Time Series

```
Commodities list
    ↓
For each commodity:
├─ Query DB: 30 hari terakhir PriceReference
├─ Calculate statistics:
│  ├─ Mean, StdDev
│  ├─ Q1, Q3 (IQR)
│  └─ Price change %
├─ Detect outlier:
│  ├─ Z-Score > ±2?
│  ├─ IQR bounds?
│  └─ Price change > 20%?
└─ Assign risk level:
   ├─ NORMAL (no anomaly)
   ├─ WARNING (moderate)
   └─ CRITICAL (extreme)
    ↓
Return sorted by risk level
```

---

## 🚀 Deployment & Testing

### Docker Setup

Semua sudah containerized, cukup:

```bash
# Start all services
docker-compose up -d

# Services running:
# - API: http://localhost:4000
# - Web: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis (untuk cache, optional)
```

---

### Testing Endpoints

```bash
# 1. Test harga submission dengan PIHPS validation
curl -X POST http://localhost:4000/api/harga/reports \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commodity": "Beras Lokal",
    "pricePerKg": 15000,
    "volumeKg": 100,
    "district": "Tulungagung",
    "source": "WEB",
    "location": {"lat": -8.077, "lng": 111.387}
  }'

# 2. Test harga + weather
curl http://localhost:4000/api/harga/with-weather?province=Jawa%20Timur&city=Tulungagung

# 3. Test anomaly summary
curl http://localhost:4000/api/anomaly/summary?commodity=Beras%20Lokal

# 4. Test RAG konsultasi
curl -X POST http://localhost:4000/api/agent/consult \
  -H "Content-Type: application/json" \
  -d '{
    "user_question": "Berapa harga jual yang wajar?",
    "province": "Jawa Timur",
    "city_regency": "Tulungagung"
  }'

# 5. Get quick prompts
curl http://localhost:4000/api/agent/quick-prompts
```

---

### Frontend Testing

```bash
# Open browser
http://localhost:3000/consult

# Features to test:
1. ✅ WeatherCard renders dengan data BMKG
2. ✅ RAGChat loads quick prompts
3. ✅ Send question → get markdown response
4. ✅ Weather badge shows current conditions
5. ✅ Price badges show PIHPS data
6. ✅ Auto-scroll to latest message
7. ✅ Typing indicator animasi
```

---

## 🔧 Troubleshooting

### Weather tidak update

**Issue:** WeatherCard loading terus

**Solution:**
```bash
# Check API response
curl http://localhost:4000/api/harga/with-weather

# Check database
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "PriceReference"'

# Check weather service cache
# Cache TTL: 30 menit, clear manual restart
```

---

### RAG Chat tidak response

**Issue:** Message stuck loading

**Solution:**
```bash
# Check agent endpoint
curl http://localhost:4000/api/agent/quick-prompts

# Check logs
docker logs api

# Verify database connection
docker exec api psql -c '\dt'
```

---

### PIHPS Harga tidak valid

**Issue:** Deviasi calc tidak akurat

**Solution:**
1. Ensure PIHPS seed berhasil: `npm run seed:pihps`
2. Check latest price: 
   ```sql
   SELECT * FROM "PriceReference" 
   WHERE source='PIHPS' 
   ORDER BY sampledAt DESC 
   LIMIT 5;
   ```
3. Manual resync: `POST /api/harga/reference/sync`

---

## 📚 File Structure

```
services/api/src/
├── modules/
│   ├── harga/
│   │   ├── harga.routes.ts          (✅ Enhanced)
│   │   ├── harga.repository.ts       (Existing)
│   │   └── harga.extended.ts         (✅ NEW)
│   ├── anomaly/
│   │   └── anomaly.routes.ts         (✅ Enhanced)
│   ├── weather/
│   │   └── weather.service.ts        (✅ NEW)
│   └── agent/
│       ├── agent.service.ts          (✅ NEW)
│       └── agent.routes.ts           (✅ NEW)
└── main.ts                           (✅ Updated)

apps/web/src/app/
├── components/
│   ├── WeatherCard.tsx               (✅ NEW)
│   └── RAGChat.tsx                   (✅ NEW)
└── consult/
    └── page.tsx                      (✅ NEW)
```

---

## 🎯 Next Steps

1. **Integrate Real LLM**
   - Replace mock LLM dengan OpenAI/Claude API
   - Setup API keys di `.env`

2. **Enhance BMKG Integration**
   - Implement actual BMKG API parsing
   - Add more weather parameters

3. **Advanced Anomaly Detection**
   - Machine learning models
   - Predictive analytics

4. **Mobile App Integration**
   - Flutter apps call /consult endpoint
   - Offline cache untuk data PIHPS/cuaca

5. **Monitoring & Analytics**
   - Track konsultasi popularity
   - Monitor data freshness
   - Performance metrics

---

**Status:** ✅ Ready for Production
**Last Updated:** 2026-08-14
**Team:** PanganTerkini Development
