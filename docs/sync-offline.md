# Offline Sync

Web PWA menyimpan draft harga di IndexedDB melalui `apps/web/src/app/lib/offline-store.ts`.

Alur:

1. Petani mengisi harga di web/mobile.
2. Aplikasi mencoba `POST /api/harga/reports`.
3. Jika API gagal dijangkau, payload disimpan sebagai draft offline.
4. Worker queue `sync-offline` disiapkan untuk sinkronisasi batch.
5. API memberi status anomali setelah data masuk.

Untuk produksi, tambahkan background sync service worker dan endpoint batch seperti `POST /api/harga/reports/batch`.
