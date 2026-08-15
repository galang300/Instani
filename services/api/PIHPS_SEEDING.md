# PIHPS Data Seeding Guide

Panduan lengkap untuk setup dan seed data harga pangan PIHPS ke dalam database PostgreSQL.

## 📋 Checklist Setup

- [ ] File CSV sudah di-copy ke `services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv`
- [ ] Database PostgreSQL sudah running
- [ ] `.env` file di `services/api/` sudah configured
- [ ] Node.js dependencies sudah installed

## 🚀 Langkah-Langkah

### 1. Setup Environment Variables

Pastikan file `.env` di `services/api/` memiliki:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/petani_dev
NODE_ENV=development
```

### 2. Install Dependencies

```bash
cd services/api
npm install csv-parser
```

Ini akan menambahkan `csv-parser` untuk parsing CSV file dengan streaming.

### 3. Buat Direktori Data

```bash
mkdir -p services/api/data
```

### 4. Copy File CSV

Copy file CSV yang sudah disiapkan ke:
```
services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv
```

### 5. Setup Database Schema

Run migration untuk membuat/update schema dengan composite unique constraint:

```bash
npm run prisma:migrate
```

Ini akan:
- Membuat table `PriceReference` (jika belum ada)
- Menambah composite unique index untuk `(commodity, source, sampledAt, province, regency)`
- Membuat index untuk performa query

### 6. Jalankan Seed Script

```bash
npm run seed:pihps
```

Script akan:
- Membaca CSV file secara streaming
- Parse dan validate setiap baris
- Batch insert ke database per 1000 baris
- Upsert jika record sudah ada (update price jika berbeda)
- Display progress dan summary

**Expected Output:**
```
📖 Reading CSV file: services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv
⏳ Processing batch of 1000 records...
✅ Batch processed: 850 created, 150 updated
⏳ Processing batch of 1000 records...
✅ Batch processed: 900 created, 100 updated

✅ Seeding completed!
📊 Total rows: 2000
✨ Created: 1750
🔄 Updated: 250
⏭️  Skipped: 0
```

## 📊 Verifying Data

### 1. Via Database

```bash
# Connect ke database
psql $DATABASE_URL

# Count records
SELECT COUNT(*) FROM "PriceReference" WHERE source = 'PIHPS';

# Check latest records
SELECT commodity, pricePerKg, province, regency, sampledAt 
FROM "PriceReference" 
WHERE source = 'PIHPS' 
ORDER BY sampledAt DESC 
LIMIT 10;
```

### 2. Via API Endpoints

Pastikan server API sudah running:
```bash
npm run dev
```

Atau start dengan:
```bash
npm start
```

Kemudian test endpoints:

```bash
# Ambil semua reference prices
curl http://localhost:4000/api/harga/reference

# Ambil reference prices untuk lokasi tertentu
curl "http://localhost:4000/api/harga/reference/by-location?province=Jawa%20Timur&regency=Tulungagung"

# Filter berdasarkan komoditas
curl "http://localhost:4000/api/harga/reference/by-location?commodity=Beras"

# Kombinasi filters
curl "http://localhost:4000/api/harga/reference/by-location?province=Jawa%20Timur&commodity=Jagung"
```

### 3. Via Prisma Studio

Visualisasi data dengan Prisma Studio:

```bash
npx prisma studio
```

Ini akan membuka UI di browser untuk explore database.

## 🔄 Query Data via Code

### TypeScript/JavaScript

```typescript
import { prisma } from "./database/prisma.js";

// Ambil harga terbaru untuk komoditas tertentu
const prices = await prisma.priceReference.findMany({
  where: {
    commodity: { equals: "Beras Lokal", mode: "insensitive" },
    source: "PIHPS",
    province: "Jawa Timur"
  },
  orderBy: { sampledAt: "desc" },
  take: 20
});

// Ambil unique tanggal sampling
const sampledDates = await prisma.priceReference.findMany({
  where: { source: "PIHPS" },
  distinct: ["sampledAt"],
  select: { sampledAt: true },
  orderBy: { sampledAt: "desc" },
  take: 5
});

// Ambil harga rata-rata per komoditas
const avgPrices = await prisma.priceReference.groupBy({
  by: ["commodity", "province"],
  where: { source: "PIHPS" },
  _avg: { pricePerKg: true },
  _count: true
});
```

## 🛠️ Troubleshooting

### Error: CSV file not found

```
❌ CSV file not found: services/api/data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv
```

**Solusi:**
1. Pastikan direktori `data/` sudah dibuat: `mkdir -p services/api/data`
2. Copy file CSV ke lokasi yang benar
3. Periksa nama file harus exact match

### Error: DATABASE_URL is not set

```
PrismaClientInitializationError: error: Environment variable `DATABASE_URL` not found
```

**Solusi:**
1. Buat/update file `.env` di `services/api/`
2. Tambahkan: `DATABASE_URL=postgresql://...`
3. Restart script

### Error: Cannot connect to database

```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solusi:**
1. Pastikan PostgreSQL sudah running
2. Periksa connection string di `.env`
3. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Error: Rows being skipped

Jika script menampilkan skipped rows, periksa:
1. Kolom `Komoditas` - jangan kosong
2. Kolom `Harga (Rp)` - harus angka valid
3. Kolom `Tanggal` - harus format YYYY-MM-DD

**Debug:** Update script untuk print skipped rows:
```javascript
// Di line yang skip row, tambah:
console.warn(`Skipped row ${totalRows}:`, row);
```

## 🔄 Reseed/Update Data

Untuk reseed data (hapus data lama dan seed ulang):

```bash
# Hapus semua PIHPS data
npx prisma db execute --stdin << 'EOF'
DELETE FROM "PriceReference" WHERE source = 'PIHPS';
EOF

# Seed ulang
npm run seed:pihps
```

Atau lebih spesifik (hapus hanya data tertentu):

```bash
# Hapus data PIHPS untuk Jawa Timur
npx prisma db execute --stdin << 'EOF'
DELETE FROM "PriceReference" WHERE source = 'PIHPS' AND province = 'Jawa Timur';
EOF
```

## 📈 Performance Considerations

- **CSV size**: Script optimal untuk 1000-50000 baris
- **Batch size**: Default 1000 baris per batch (bisa di-adjust di script)
- **Insert speed**: ~500-1000 rows/second (tergantung specs server)
- **Memory**: Streaming parser hemat memory, even untuk file besar

Untuk file >100MB, consider:
1. Split CSV ke beberapa file
2. Run seed berkali-kali
3. Increase batch size ke 2000-5000

## 🔗 Related Endpoints

Setelah seed berhasil, endpoint berikut tersedia:

```
GET  /api/harga/reference
     → Ambil semua reference prices (fallback ke live PIHPS jika DB kosong)

GET  /api/harga/reference/by-location?province=X&regency=Y&commodity=Z
     → Query reference prices by location & commodity
     → Query params: province, regency, commodity (all optional)

POST /api/harga/reference/sync
     → Manual sync dengan live PIHPS scraper

GET  /api/harga/reports
     → Ambil price reports dari petani

POST /api/harga/reports
     → Submit laporan harga baru (need auth token)
```

## 📚 Schema Details

### Table: PriceReference

```sql
CREATE TABLE "PriceReference" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity VARCHAR NOT NULL,
  pricePerKg INTEGER NOT NULL,
  source VARCHAR NOT NULL,           -- 'PIHPS', 'BAPANAS', etc
  province VARCHAR NOT NULL,         -- 'Jawa Timur', 'Jawa Barat', etc
  regency VARCHAR NOT NULL,          -- 'Tulungagung', 'Surabaya', etc
  sampledAt TIMESTAMP NOT NULL,      -- Date when price was sampled
  createdAt TIMESTAMP DEFAULT now(),
  
  UNIQUE (commodity, source, sampledAt, province, regency),
  INDEX (commodity, source, sampledAt)
);
```

### Key Features

✅ **Composite unique constraint** - Prevent duplicates for same commodity/source/date/location
✅ **Optimal indexing** - Fast queries by commodity, source, date
✅ **Timezone aware** - sampledAt stored in UTC
✅ **Audit trail** - createdAt tracks when record was inserted

## 🎯 Next Steps

1. ✅ Seed data dengan script
2. Verify data di database
3. Test API endpoints
4. Integrate dengan frontend (query by location)
5. Setup monitoring untuk data freshness

---

**Need help?** Check:
- [scripts/README.md](scripts/README.md) - Detailed script documentation
- [prisma/schema.prisma](prisma/schema.prisma) - Database schema
- [src/modules/harga/](src/modules/harga/) - API implementation
