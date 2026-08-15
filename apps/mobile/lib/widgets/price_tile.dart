import 'package:flutter/material.dart';

enum PriceBand { fair, watch, anomaly }

class PriceTile extends StatelessWidget {
  const PriceTile({
    required this.commodity,
    required this.district,
    required this.pricePerKg,
    required this.referencePrice,
    required this.status,
    this.band = PriceBand.fair,
    this.onClose,
    super.key,
  });

  final String commodity;
  final String district;
  final int pricePerKg;
  final int referencePrice;
  final String status;
  final PriceBand band;
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final palette = _paletteForBand(band);
    final label = switch (band) {
      PriceBand.fair => 'Wajar',
      PriceBand.watch => 'Sedang',
      PriceBand.anomaly => 'Anomali',
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: palette.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: palette.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.82),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: palette.foreground,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    commodity,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF123326),
                    ),
                  ),
                ),
                IconButton.filledTonal(
                  visualDensity: VisualDensity.compact,
                  onPressed: onClose,
                  icon: const Icon(Icons.close, size: 16),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _MiniMetric(
                    label: 'Harga laporan',
                    value: _rupiah(pricePerKg),
                    caption: district,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _MiniMetric(
                    label: 'Harga acuan',
                    value: _rupiah(referencePrice),
                    caption: 'PIHPS/CSV',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.78),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.verified_outlined,
                      size: 18, color: palette.foreground),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _adviceForStatus(status),
                      style: TextStyle(
                        color: palette.foreground,
                        height: 1.25,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  const _MiniMetric({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              color: Color(0xFF738276),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 17,
                color: Color(0xFF11251B),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            caption,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10, color: Color(0xFF79877D)),
          ),
        ],
      ),
    );
  }
}

class _PricePalette {
  const _PricePalette({
    required this.background,
    required this.border,
    required this.foreground,
  });

  final Color background;
  final Color border;
  final Color foreground;
}

_PricePalette _paletteForBand(PriceBand band) {
  return switch (band) {
    PriceBand.fair => const _PricePalette(
        background: Color(0xFFD8F6E6),
        border: Color(0xFF7BD9A7),
        foreground: Color(0xFF087348),
      ),
    PriceBand.watch => const _PricePalette(
        background: Color(0xFFFFD68A),
        border: Color(0xFFF5B94F),
        foreground: Color(0xFF8A5200),
      ),
    PriceBand.anomaly => const _PricePalette(
        background: Color(0xFFFF777C),
        border: Color(0xFFE84654),
        foreground: Color(0xFF8A111F),
      ),
  };
}

String _adviceForStatus(String status) {
  return switch (status) {
    'LOW' => 'Anomali rendah. Tahan menawar, cek ulang acuan dan kualitas panen.',
    'HIGH' => 'Anomali tinggi. Pastikan stok dan permintaan sebelum buka lelang.',
    _ => 'Saran: tawar menawar dalam rentang harga wajar daerah.',
  };
}

String _rupiah(int value) {
  final text = value.toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (match) => '${match[1]}.',
      );
  return 'Rp$text';
}
