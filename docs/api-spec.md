# API Spec

Base URL lokal: `http://localhost:4000`.

Saat memakai Docker, `api` menjalankan `prisma db push` ke service `postgres` sebelum start.
Web dan admin tetap memanggil API lewat URL publik host, default `http://localhost:4000`.

## Auth dan Verifikasi Petani

`POST /api/auth/admin/login`

Login dashboard admin. Jika belum ada user admin, kredensial dari `.env` (`ADMIN_EMAIL`
dan `ADMIN_PASSWORD`) akan membuat admin pertama.

```json
{
  "identifier": "email-admin-anda",
  "password": "password-admin-anda-dari-env"
}
```

`GET /api/auth/admin/me`

Validasi sesi admin memakai Bearer token.

`POST /api/auth/petani/register`

Membuat akun dasar sebagai pembeli/tengkulak. KTP tidak dikirim di tahap ini.

```json
{
  "username": "siti_tani",
  "contactMethod": "PHONE",
  "phone": "081234567890",
  "password": "secret123"
}
```

`POST /api/auth/petani/login`

Login hanya memakai email atau telepon dan kata sandi.

```json
{
  "identifier": "081234567890",
  "password": "secret123"
}
```

`POST /api/users/me/farmer-application`

Mengajukan KTP setelah login. Admin akan menyetujui akun menjadi `PETANI`.

```json
{
  "ktpImageName": "ktp.jpg",
  "ktpImageDataUrl": "data:image/jpeg;base64,..."
}
```

`GET /api/users/farmer-applications`

Daftar pengajuan KTP untuk dashboard admin. Wajib Bearer token admin.

`POST /api/users/farmer-applications/:id/approve`

Menyetujui pengajuan dan mengubah role user menjadi `PETANI`. Wajib Bearer token admin.

`POST /api/users/farmer-applications/:id/reject`

Menolak pengajuan. User tetap memakai akses pembeli/tengkulak. Wajib Bearer token admin.

## Harga

`GET /api/harga/reports`

Default endpoint ini hanya menampilkan laporan hari ini. Admin bisa membaca seluruh laporan bulan
berjalan dengan query `period=month` dan Bearer token admin.

Query opsional:

- `commodity`
- `district`
- `period=today|month`

`POST /api/harga/reports`

```json
{
  "commodity": "Gabah Kering Panen",
  "pricePerKg": 5400,
  "volumeKg": 800,
  "district": "Ngantru",
  "reporterName": "Petani Demo",
  "source": "WEB",
  "location": { "lat": -7.9532, "lng": 111.9032 }
}
```

Poin kinerja petani dihitung otomatis dari laporan harga bulan berjalan:

- `HIGH`: 10 poin
- `NORMAL`: 8 poin
- `LOW` atau `INSUFFICIENT_DATA`: 0 poin

Jika total poin mencapai ambang voucher, API mengembalikan benefit otomatis dengan status
`CONFIRMED`.

`GET /api/rating/me/farmer-performance`

Ringkasan poin, frekuensi laporan harian, dan voucher otomatis untuk petani terverifikasi.
Wajib Bearer token petani.

`GET /api/rating/farmers`

Dashboard admin untuk melihat frekuensi laporan, poin bulanan, status voucher, dan seluruh laporan
harga bulan berjalan per petani. Wajib Bearer token admin.

`GET /api/harga/admin/reporting-dashboard`

Rekap admin tingkat dashboard untuk laporan harian dan seluruh laporan harga bulan berjalan. Wajib
Bearer token admin.

## Anomali

`GET /api/anomaly/summary?commodity=Gabah%20Kering%20Panen`

`POST /api/anomaly/detect`

```json
{
  "values": [5600, 5700, 5500, 5800, 5650],
  "value": 5200
}
```

## HPP

`POST /api/hpp/calculate`

```json
{
  "seedCost": 650000,
  "fertilizerCost": 1150000,
  "laborCost": 1800000,
  "landRent": 900000,
  "logisticsCost": 350000,
  "yieldKg": 1500,
  "marginPercent": 12
}
```

## WhatsApp

`POST /api/whatsapp/webhook`

```json
{
  "from": "Petani Demo",
  "phone": "628123456789",
  "text": "harga gabah 5400"
}
```
