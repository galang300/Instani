# Anomaly Detection

MVP memakai tiga metode:

- Z-Score: utama untuk flag harga rendah/tinggi.
- IQR: tahan terhadap outlier ekstrem.
- MAD: tahan terhadap distribusi kecil yang tidak normal.

Ambang awal:

- `z <= -1.5`: harga rendah.
- `z >= 1.5`: harga tinggi.
- minimum 5 sampel per komoditas.

Keputusan produksi sebaiknya menggabungkan harga lokal, referensi Bapanas/PIHPS, musim panen, dan HPP petani.
