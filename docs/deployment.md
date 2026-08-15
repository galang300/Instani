# Deployment

Jalankan seluruh stack:

```bash
docker compose up --build
```

Atau, untuk instalasi Docker Compose lama:

```bash
docker-compose up --build
```

Komponen:

- Nginx: reverse proxy web, API, dan websocket.
- PostgreSQL/PostGIS: database utama.
- Redis: queue dan realtime adapter.
- MinIO: storage S3-compatible.
- Prometheus/Grafana: monitoring.

Checklist produksi:

- Ganti `JWT_SECRET`.
- Isi token WhatsApp provider.
- Buat bucket MinIO `panganterkini`.
- Jalankan Prisma migration.
- Tambahkan TLS pada Nginx.
- Batasi CORS sesuai domain resmi.

## Deploy Prototype Web ke Vercel

Untuk prototype lomba, deploy web Next.js dari root monorepo. Jangan set Root Directory ke
`apps/web`, karena aplikasi web masih memakai package lokal dari `packages/*`.

Konfigurasi sudah disiapkan di `vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "npm ci",
  "buildCommand": "npm --workspace @panganterkini/web run build",
  "outputDirectory": "apps/web/.next"
}
```

Environment variable minimal di Vercel:

```bash
NEXT_PUBLIC_API_URL=https://domain-api-anda
NEXT_PUBLIC_REALTIME_URL=https://domain-realtime-anda
```

Catatan penting:

- Vercel ini hanya untuk web prototype.
- API, worker, realtime, scraper, database, Redis, dan MinIO tetap perlu dijalankan di hosting
  backend terpisah atau server Docker.
- `apps/mobile/` sementara dikeluarkan dari paket deploy lewat `.vercelignore`, supaya prototype
  fokus ke web responsive.
- Jangan isi secret asli di `.env.example`. Simpan secret produksi langsung di dashboard Vercel
  atau secret manager backend.
