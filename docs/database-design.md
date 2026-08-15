# Database Design

Database utama memakai PostgreSQL + PostGIS. Prisma schema tersedia di `services/api/prisma/schema.prisma`.

Entitas inti:

- `User`: pembeli/tengkulak, petani, admin, penyuluh. Akun baru masuk sebagai pembeli/tengkulak dulu; role `PETANI` diberikan admin setelah pengajuan KTP disetujui.
- `Gapoktan`: kelompok tani untuk verifikasi sosial dan anti-sybil.
- `PriceReport`: input harga lapangan dengan lokasi, sumber, z-score, dan status anomali.
- `PriceReference`: data referensi Bapanas/PIHPS.
- `Auction` dan `Bid`: lelang panen realtime.
- `Transaction`, `Receipt`, `Rating`: alur transaksi, e-nota, dan reputasi.
- `GroupBuyingOrder`: rencana B2C dan MOQ.
- `NotificationLog`: audit broadcast WhatsApp/FCM.

Untuk PostGIS penuh, field latitude/longitude dapat ditambah kolom `geometry(Point, 4326)` lewat migration SQL manual.
