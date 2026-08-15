# Auction Flow

Tahap lelang:

1. Petani membuat posting panen dengan komoditas, volume, lokasi, dan harga dasar.
2. Tengkulak terverifikasi masuk room Socket.IO `auction:<id>`.
3. Bid dikirim lewat event `auction:bid`.
4. Gateway membroadcast `auction:bid-created`.
5. Saat ditutup, gateway mengirim `auction:closed` beserta pemenang.
6. API membuat transaksi dan e-nota.

Service realtime sekarang masih in-memory untuk MVP. Produksi perlu Redis adapter dan penyimpanan bid di PostgreSQL.
