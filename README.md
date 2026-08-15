# PanganTerkini

Monorepo MVP untuk proposal PKM transparansi harga pangan di Tulungagung. Sistem ini menyiapkan input harga petani via web/mobile/WhatsApp, deteksi anomali Z-Score/IQR/MAD, warning harga rendah, peta harga, kalkulator HPP, realtime lelang, dan fondasi integrasi Bapanas/PIHPS.

## Isi proyek

- `apps/web`: portal pengguna PWA berbasis Next.js, Tailwind, IndexedDB, Web Speech API, dan Leaflet.
- `apps/admin`: dashboard admin untuk monitoring anomali, verifikasi, dan broadcast.
- `apps/mobile`: skeleton Flutter untuk input harga mobile ringan dan offline sync.
- `services/api`: Express API untuk auth OTP, harga, anomaly, early warning, HPP, WhatsApp webhook, lelang, transaksi, rating, e-nota, dan group buying.
- `services/realtime`: Socket.IO gateway untuk bidding realtime.
- `services/worker`: BullMQ worker untuk offline sync, video, anomaly, dan notifikasi.
- `services/scraper`: FastAPI scraper untuk Bapanas mock dan PIHPS/BI live JSON scraper dengan cache auto-refresh.
- `services/ml-anomaly`: FastAPI microservice deteksi Z-Score/IQR/MAD.
- `packages/*`: tipe data, validasi Zod, config komoditas/kecamatan, dan helper UI.
- `infra/*`: Nginx, Prometheus, Grafana, PostgreSQL/PostGIS, dan MinIO.

## Menjalankan lokal

```bash
npm install
npm run dev:api
npm run dev:web
```

Opsional untuk dependency lokal:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Jalankan semua container:

```bash
docker compose up --build
```

Jika Docker di mesin memakai binary lama, gunakan `docker-compose up --build`.

URL default:

- Web portal: `http://localhost:3000`
- Login/akun pengguna: `http://localhost:3000/login`
- Fitur pembeli/tengkulak: `http://localhost:3000/pembeli`
- Fitur petani: `http://localhost:3000/petani`
- Admin: `http://localhost:3001`
- API: `http://localhost:4000`
- Realtime: `http://localhost:4001`
- Scraper: `http://localhost:5000`
- ML anomaly: `http://localhost:5001`
- Nginx gateway: `http://localhost:8080`
- MinIO console: `http://localhost:9001`

## Endpoint utama

```bash
GET  /health
GET  /api/harga/reports
POST /api/harga/reports
GET  /api/harga/reference
POST /api/harga/reference/sync
GET  /api/harga/heatmap
GET  /scrape/pihps
GET  /scrape/pihps?force=true
GET  /api/anomaly/summary?commodity=Gabah%20Kering%20Panen
POST /api/anomaly/detect
GET  /api/early-warning
POST /api/hpp/calculate
POST /api/auth/admin/login
GET  /api/auth/admin/me
POST /api/auth/petani/register
POST /api/auth/petani/login
POST /api/users/me/farmer-application
GET  /api/users/farmer-applications
POST /api/whatsapp/webhook
```

## Scraper PIHPS/BI

Scraper PIHPS mengambil data dari endpoint internal halaman `https://www.bi.go.id/hargapangan`, lalu menormalisasi kolom tanggal menjadi item harga terbaru per komoditas. Service scraper menjalankan auto-refresh berkala lewat `PIHPS_SYNC_INTERVAL_SECONDS`; endpoint `/scrape/pihps` mengembalikan cache terbaru, sedangkan `/scrape/pihps?force=true` memaksa scrape ulang saat itu juga.

Default filter di `.env.example` memakai `PIHPS_PROVINCE_ID=16` atau Jawa Timur. Ubah `PIHPS_PROVINCE_ID`, `PIHPS_REGENCY_ID`, dan `PIHPS_COMCAT_ID` jika ingin membatasi provinsi, kabupaten/kota, atau komoditas lain.

Untuk menyimpan hasil PIHPS ke PostgreSQL, jalankan API lalu panggil:

```bash
curl -X POST http://localhost:4000/api/harga/reference/sync
```

Setelah sinkronisasi, `GET /api/harga/reference` akan membaca data terbaru dari tabel `PriceReference`; jika database belum siap, endpoint tetap fallback ke cache scraper PIHPS.

## Roadmap PKM

1. MVP lapangan: harga, input petani, Z-Score/IQR, warning harga rendah, WhatsApp bot.
2. Offline-first, heatmap, kalkulator HPP.
3. Lelang realtime, rating tengkulak, e-nota.
4. B2C, MOQ, group buying, self-pickup.
