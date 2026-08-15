# Backend Deployment

Dokumen ini menyiapkan backend publik untuk prototype Instani/PanganTerkini.

## Target Arsitektur Prototype

- Web frontend: Vercel.
- API utama: service Docker `services/api/Dockerfile`.
- Database: managed PostgreSQL dengan PostGIS.
- Redis: managed Redis.
- Realtime Socket.IO: service Docker `services/realtime/Dockerfile`.
- Worker queue: service Docker `services/worker/Dockerfile`.
- Scraper PIHPS/BAPANAS: service Docker `services/scraper/Dockerfile`.
- ML anomaly: service Docker `services/ml-anomaly/Dockerfile`.

Untuk demo cepat, deploy minimal `api`, PostgreSQL, dan Redis terlebih dahulu. Realtime,
worker, scraper, dan ML bisa menyusul setelah API utama hidup.

## Data CSV Acuan

File CSV acuan di `services/api/data/*.csv` sengaja boleh ikut Git agar backend publik tetap
punya data referensi saat Docker build dari GitHub.

Folder tersebut tetap diabaikan oleh Vercel lewat `.vercelignore`, karena frontend web tidak
membutuhkan CSV langsung.

## Opsi Railway

1. Buat project baru dari repo GitHub `galang300/Instani`.
2. Tambahkan plugin/service PostgreSQL.
3. Tambahkan plugin/service Redis.
4. Buat service `api` dari Dockerfile:
   - Root repo: `.`
   - Dockerfile path: `services/api/Dockerfile`
   - Jika Railway meminta path absolut, isi `/services/api/Dockerfile`.
   - Repo juga sudah menyediakan `railway.json` untuk memaksa builder Dockerfile.
   - Start command:
     ```bash
     npx prisma db push --schema services/api/prisma/schema.prisma --accept-data-loss && npm --workspace @panganterkini/api run start
     ```
5. Isi environment variable `api`:
   ```bash
   NODE_ENV=production
   DATABASE_URL=<connection string PostgreSQL>
   REDIS_URL=<connection string Redis>
   JWT_SECRET=<secret panjang acak>
   WHATSAPP_PROVIDER=mock
   SCRAPER_URL=<URL scraper kalau sudah dideploy>
   LLM_API_KEY=<opsional untuk RAG asli>
   LLM_BASE_URL=https://api.openai.com/v1
   LLM_MODEL=gpt-4o-mini
   LLM_FALLBACK_ENABLED=true
   ```
6. Deploy dan cek endpoint:
   ```text
   https://domain-api/health
   ```

## Opsi Render

1. Buat PostgreSQL managed database.
2. Buat Redis/Key Value managed service.
3. Buat Web Service Docker untuk API:
   - Repo: `galang300/Instani`
   - Dockerfile path: `services/api/Dockerfile`
   - Build context: root repo
   - Start command:
     ```bash
     npx prisma db push --schema services/api/prisma/schema.prisma --accept-data-loss && npm --workspace @panganterkini/api run start
     ```
4. Isi environment variable sama seperti opsi Railway.
5. Cek `/health` setelah deploy selesai.

## Menghubungkan Vercel Web ke Backend Publik

Setelah API punya domain publik, buka Vercel project `instani-web`, lalu set:

```bash
NEXT_PUBLIC_API_URL=https://domain-api-anda
NEXT_PUBLIC_REALTIME_URL=https://domain-realtime-anda
NEXT_PUBLIC_DEMO_FALLBACK=false
```

Redeploy Vercel setelah env disimpan.

## Urutan Deploy yang Disarankan

1. PostgreSQL + PostGIS.
2. Redis.
3. API.
4. Set `NEXT_PUBLIC_API_URL` di Vercel.
5. Realtime Socket.IO.
6. Worker.
7. Scraper.
8. ML anomaly.

Dengan urutan ini, prototype web sudah bisa menampilkan data asli dari API lebih cepat, sementara
fitur tambahan bisa dinyalakan bertahap.
