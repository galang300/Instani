# PIHPS Data Seeding Script

Script ini berfungsi untuk memuat data harga pangan PIHPS dari file CSV ke dalam tabel `PriceReference` di PostgreSQL.

## Persyaratan

- File CSV harus berada di: `services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv`
- Database PostgreSQL sudah running
- `.env` file di `services/api/` sudah configured dengan `DATABASE_URL`

## Format CSV

CSV harus memiliki kolom-kolom berikut (case-sensitive):
```
Jenis Pasar, Provinsi, Kabupaten/Kota, Kategori, Komoditas, Satuan, Tanggal, Harga (Rp)
```

**Contoh:**
```
Pasar Tradisional,Jawa Timur,Tulungagung,Bahan Pokok,Beras Lokal,Kg,2026-07-13,14500
Pasar Tradisional,Jawa Timur,Tulungagung,Bahan Pokok,Jagung Pipil,Kg,2026-07-13,4800
```

Kolom yang digunakan:
- **Komoditas**: Nama komoditas (required)
- **Harga (Rp)**: Harga per kg (required, akan di-parse menjadi integer)
- **Tanggal**: Format YYYY-MM-DD (required)
- **Provinsi**: Nama provinsi (default: "Jawa Timur" jika kosong)
- **Kabupaten/Kota**: Nama kabupaten/kota (default: "Tulungagung" jika kosong)

## Instalasi Dependencies

```bash
cd services/api
npm install csv-parser
```

## Menjalankan Script

### 1. Buat Direktori Data (Jika Belum Ada)

```bash
mkdir -p services/api/data
```

### 2. Letakkan File CSV

Copy file CSV ke lokasi yang benar:
```
services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv
```

### 3. Setup Database

Pastikan migration Prisma sudah di-run (untuk composite unique constraint):

```bash
cd services/api
npm run prisma:migrate
```

### 4. Jalankan Seed Script

```bash
npm run seed:pihps
```

Atau langsung dengan Node:
```bash
node scripts/seed-pihps.js
```

## Output

Script akan menampilkan progress:

```
📖 Reading CSV file: services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv
⏳ Processing batch of 1000 records...
✅ Batch processed: 850 created, 150 updated
⏳ Processing batch of 500 records...
✅ Batch processed: 480 created, 20 updated

✅ Seeding completed!
📊 Total rows: 1500
✨ Created: 1330
🔄 Updated: 170
⏭️  Skipped: 0
```

## Fitur Script

✅ **Streaming parser** - Membaca CSV secara streaming, hemat memory untuk file besar
✅ **Batch processing** - Insert per 1000 baris untuk performa optimal
✅ **Upsert otomatis** - Update harga jika record sudah ada (composite key: commodity + source + sampledAt + province + regency)
✅ **Error handling** - Skip row yang invalid, log warning untuk debugging
✅ **Progress reporting** - Real-time feedback tentang jumlah created/updated/skipped

## Database Schema

Tabel `PriceReference` memiliki struktur:

```sql
CREATE TABLE "PriceReference" (
  id STRING PRIMARY KEY,
  commodity STRING NOT NULL,
  pricePerKg INT NOT NULL,
  source STRING NOT NULL,
  province STRING NOT NULL,
  regency STRING NOT NULL,
  sampledAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX "PriceReference_commodity_source_sampledAt_province_regency_key"
  ON "PriceReference" (commodity, source, sampledAt, province, regency);

CREATE INDEX "PriceReference_commodity_source_sampledAt_idx"
  ON "PriceReference" (commodity, source, sampledAt);
```

## Query Data Setelah Seeding

### Via API

```bash
# Ambil semua reference prices
curl http://localhost:4000/api/harga/reference

# Ambil reference prices berdasarkan lokasi
curl "http://localhost:4000/api/harga/reference/by-location?province=Jawa%20Timur&regency=Tulungagung"

# Ambil reference prices untuk komoditas tertentu
curl "http://localhost:4000/api/harga/reference/by-location?commodity=Beras%20Lokal"
```

### Via Prisma Client

```typescript
import { prisma } from "./database/prisma.js";

// Ambil harga terbaru untuk komoditas tertentu di lokasi tertentu
const prices = await prisma.priceReference.findMany({
  where: {
    commodity: "Beras Lokal",
    source: "PIHPS",
    province: "Jawa Timur",
    regency: "Tulungagung"
  },
  orderBy: { sampledAt: "desc" },
  take: 10
});
```

## Troubleshooting

### Error: "CSV file not found"

Pastikan file CSV ada di lokasi yang benar:
```
services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv
```

### Error: "Unique constraint violation"

Ini normal jika script dijalankan berkali-kali. Script akan update harga existing.

### Error: "DATABASE_URL is not set"

Pastikan `.env` di `services/api/` memiliki:
```
DATABASE_URL=postgresql://user:password@localhost:5432/petani
```

### Rows Skipped

Rows discarded jika:
- Komoditas kosong
- Harga tidak valid (bukan angka)
- Tanggal tidak valid (bukan format YYYY-MM-DD)

Periksa CSV file untuk memastikan data valid.

## Performance Tips

- Script ini optimal untuk CSV dengan 1000-10000 baris
- Untuk file lebih besar (>50MB), consider split ke beberapa file
- Batch size bisa di-adjust di script (ubah `batch.length >= 1000`)

## Cleanup/Reset Data

Untuk menghapus semua PIHPS data dan seed ulang:

```bash
# Via Prisma CLI
npx prisma db execute --stdin < delete-pihps.sql

# Atau via psql directly
psql $DATABASE_URL -c 'DELETE FROM "PriceReference" WHERE source = '\''PIHPS'\'';'

# Kemudian jalankan seed ulang
npm run seed:pihps
```
