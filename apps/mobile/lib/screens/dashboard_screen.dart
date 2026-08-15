import 'package:flutter/material.dart';

import '../widgets/price_tile.dart';

const _green = Color(0xFF15965A);
const _darkGreen = Color(0xFF0B6F43);
const _ink = Color(0xFF10251B);
const _muted = Color(0xFF66756C);
const _line = Color(0xFFE0ECE5);
const _softGreen = Color(0xFFE9F8EF);

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  final _prices = const [
    _PriceSample(
      commodity: 'Beras',
      district: 'Kab. Sidoarjo',
      pricePerKg: 13650,
      referencePrice: 13700,
      status: 'NORMAL',
      band: PriceBand.fair,
    ),
    _PriceSample(
      commodity: 'Cabai Merah',
      district: 'Jawa Timur',
      pricePerKg: 62000,
      referencePrice: 56000,
      status: 'HIGH',
      band: PriceBand.watch,
    ),
    _PriceSample(
      commodity: 'Gabah Kering Panen',
      district: 'Ngantru',
      pricePerKg: 3800,
      referencePrice: 5600,
      status: 'LOW',
      band: PriceBand.anomaly,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final pages = [
      _HomePage(
        prices: _prices,
        onOpenReport: () => _pushPage(const _ReportPricePage()),
        onOpenHpp: () => _pushPage(const _HppPage()),
      ),
      _HargaPage(prices: _prices),
      const _LelangPage(),
      const _D2CPage(),
      const _ProfilePage(),
    ];

    return Scaffold(
      appBar: AppBar(
        leading: Icon(_appBarIcon),
        title: Text(_appBarTitle),
        actions: [
          IconButton(
            tooltip: 'Notifikasi',
            onPressed: () {},
            icon: const Icon(Icons.notifications_none_rounded),
          ),
        ],
      ),
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        height: 66,
        selectedIndex: _selectedIndex,
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFDDF4E8),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.sell_outlined),
            selectedIcon: Icon(Icons.sell),
            label: 'Harga',
          ),
          NavigationDestination(
            icon: Icon(Icons.gavel_outlined),
            selectedIcon: Icon(Icons.gavel),
            label: 'Lelang',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_outlined),
            selectedIcon: Icon(Icons.shopping_cart),
            label: 'Jual D2C',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }

  IconData get _appBarIcon {
    return switch (_selectedIndex) {
      1 => Icons.monitor_heart_outlined,
      2 => Icons.gavel_outlined,
      3 => Icons.shopping_cart_outlined,
      4 => Icons.person_outline,
      _ => Icons.grass_outlined,
    };
  }

  String get _appBarTitle {
    return switch (_selectedIndex) {
      1 => 'Monitoring Harga',
      2 => 'Lelang Real Time',
      3 => 'Jual Langsung (D2C)',
      4 => 'Profil Saya',
      _ => 'Instani',
    };
  }

  void _pushPage(Widget page) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => page),
    );
  }
}

class _HomePage extends StatelessWidget {
  const _HomePage({
    required this.prices,
    required this.onOpenReport,
    required this.onOpenHpp,
  });

  final List<_PriceSample> prices;
  final VoidCallback onOpenReport;
  final VoidCallback onOpenHpp;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      children: [
        const _LocationChip(),
        const SizedBox(height: 12),
        const _MonitoringCard(),
        const SizedBox(height: 12),
        _ActionRow(onOpenReport: onOpenReport, onOpenHpp: onOpenHpp),
        const SizedBox(height: 12),
        const _WeatherPanel(),
        const SizedBox(height: 12),
        _SectionHeader(
          title: 'Harga acuan terdekat',
          actionLabel: 'Lihat semua',
          onPressed: () {},
        ),
        const SizedBox(height: 8),
        for (final price in prices)
          _CompactPriceCard(
            commodity: price.commodity,
            district: price.district,
            pricePerKg: price.pricePerKg,
            status: price.status,
          ),
      ],
    );
  }
}

class _HargaPage extends StatelessWidget {
  const _HargaPage({required this.prices});

  final List<_PriceSample> prices;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      children: [
        const _LocationChip(),
        const SizedBox(height: 12),
        const _MarketMapCard(),
        const SizedBox(height: 12),
        const _SegmentTabs(labels: ['Semua', 'Wajar', 'Sedang', 'Anomali']),
        const SizedBox(height: 12),
        const Text(
          'Harga wajar',
          style: _sectionStyle,
        ),
        const SizedBox(height: 8),
        PriceTile(
          commodity: prices[0].commodity,
          district: prices[0].district,
          pricePerKg: prices[0].pricePerKg,
          referencePrice: prices[0].referencePrice,
          status: prices[0].status,
          band: prices[0].band,
        ),
        const Text('Perlu pantau', style: _sectionStyle),
        const SizedBox(height: 8),
        PriceTile(
          commodity: prices[1].commodity,
          district: prices[1].district,
          pricePerKg: prices[1].pricePerKg,
          referencePrice: prices[1].referencePrice,
          status: prices[1].status,
          band: prices[1].band,
        ),
        const Text('Anomali', style: _sectionStyle),
        const SizedBox(height: 8),
        PriceTile(
          commodity: prices[2].commodity,
          district: prices[2].district,
          pricePerKg: prices[2].pricePerKg,
          referencePrice: prices[2].referencePrice,
          status: prices[2].status,
          band: prices[2].band,
        ),
      ],
    );
  }
}

class _LelangPage extends StatelessWidget {
  const _LelangPage();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      children: const [
        _AuctionLiveCard(),
        SizedBox(height: 12),
        _BuyerJoinCard(),
        SizedBox(height: 12),
        _AuctionNoteCard(),
      ],
    );
  }
}

class _D2CPage extends StatelessWidget {
  const _D2CPage();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      children: const [
        _DirectSaleCard(
          title: 'Padi GKP Segar',
          subtitle: 'Ngantru, siap kirim hari ini',
          price: 6500,
          quota: 0.72,
        ),
        SizedBox(height: 12),
        _DirectSaleCard(
          title: 'Jagung Pipilan Kering',
          subtitle: 'Sidoarjo, panen sortasi',
          price: 4200,
          quota: 0.58,
        ),
      ],
    );
  }
}

class _ProfilePage extends StatelessWidget {
  const _ProfilePage();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      children: const [
        _ProfileHero(),
        SizedBox(height: 12),
        _ProfileSettings(),
      ],
    );
  }
}

class _ReportPricePage extends StatelessWidget {
  const _ReportPricePage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lapor Harga Tengkulak'),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _FieldLabel('Komoditas'),
          const TextField(
            decoration: InputDecoration(hintText: 'Padi GKP'),
          ),
          const SizedBox(height: 12),
          const _FieldLabel('Harga tawaran tengkulak'),
          const TextField(
            keyboardType: TextInputType.number,
            decoration: InputDecoration(prefixText: 'Rp ', hintText: '5.000'),
          ),
          const SizedBox(height: 12),
          const _FieldLabel('Kuantitas'),
          const TextField(
            keyboardType: TextInputType.number,
            decoration: InputDecoration(suffixText: 'kg', hintText: '500'),
          ),
          const SizedBox(height: 12),
          const _FieldLabel('Nama tengkulak'),
          const TextField(
            decoration: InputDecoration(hintText: 'Nama opsional'),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {},
            icon: const Icon(Icons.warning_amber_rounded),
            label: const Text('Validasi & kirim laporan'),
          ),
          const SizedBox(height: 10),
          const Text(
            'Data akan dicek dengan acuan PIHPS/CSV dan laporan tersimpan.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _HppPage extends StatelessWidget {
  const _HppPage();

  @override
  Widget build(BuildContext context) {
    const costs = [
      _HppCost('Bibit', 250000),
      _HppCost('Pupuk urea + NPK', 480000),
      _HppCost('Ongkos bajak', 360000),
      _HppCost('Ongkos tanam', 400000),
      _HppCost('Irigasi', 150000),
      _HppCost('Ongkos panen', 350000),
      _HppCost('Karung & angkut', 190000),
    ];

    final total = costs.fold<int>(0, (sum, item) => sum + item.amount);
    final hpp = total ~/ 500;
    final target = (hpp * 1.12).round();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kalkulator HPP'),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Catat semua biaya produksi dari tanam hingga panen',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  for (final item in costs)
                    _CostRow(label: item.label, amount: item.amount),
                  const Divider(height: 24),
                  _CostRow(
                    label: 'Total modal',
                    amount: total,
                    isStrong: true,
                  ),
                  const _YieldRow(),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ResultCard(
                  label: 'HPP/kg',
                  value: _rupiah(hpp),
                  caption: 'Modal / hasil',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ResultCard(
                  label: 'Target jual',
                  value: _rupiah(target),
                  caption: 'Margin 12%',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MonitoringCard extends StatelessWidget {
  const _MonitoringCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                _IconBadge(icon: Icons.query_stats, color: _green),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ringkasan pasar hari ini',
                        style: TextStyle(
                          color: _ink,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Sidoarjo, Jawa Timur',
                        style: TextStyle(color: _muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                _StatusPill(label: 'LIVE', color: _green),
              ],
            ),
            const SizedBox(height: 14),
            const Row(
              children: [
                Expanded(
                  child: _StatBox(
                    label: 'Harga beras',
                    value: 'Rp13.650',
                    accent: _green,
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: _StatBox(
                    label: 'Anomali',
                    value: '20',
                    accent: Colors.red,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Row(
              children: [
                Expanded(
                  child: _StatBox(
                    label: 'Laporan',
                    value: '44',
                    accent: Color(0xFF1D7DD7),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: _StatBox(
                    label: 'Rerata',
                    value: 'Rp62k',
                    accent: Color(0xFFE59616),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFECEC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.red),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Harga tawaran anomali perlu dicek sebelum buka lelang.',
                      style: TextStyle(
                        color: Color(0xFF9C1D1D),
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
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

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.onOpenReport,
    required this.onOpenHpp,
  });

  final VoidCallback onOpenReport;
  final VoidCallback onOpenHpp;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: onOpenReport,
            icon: const Icon(Icons.assignment_add),
            label: const Text('Lapor harga'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: FilledButton.icon(
            onPressed: onOpenHpp,
            icon: const Icon(Icons.calculate_outlined),
            label: const Text('Kalkulator HPP'),
          ),
        ),
      ],
    );
  }
}

class _WeatherPanel extends StatelessWidget {
  const _WeatherPanel();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                _IconBadge(icon: Icons.cloud_outlined, color: Color(0xFF1D7DD7)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Perkiraan BMKG',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                  ),
                ),
                _StatusPill(label: 'Resmi', color: Color(0xFF1D7DD7)),
              ],
            ),
            const SizedBox(height: 12),
            const Row(
              children: [
                Expanded(child: _WeatherMetric(label: 'Suhu', value: '27°C')),
                SizedBox(width: 8),
                Expanded(child: _WeatherMetric(label: 'Kelembapan', value: '75%')),
                SizedBox(width: 8),
                Expanded(child: _WeatherMetric(label: 'Angin', value: '8 km/h')),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFDDF8E9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Waktu optimal untuk penyemprotan hama dan perawatan tanaman.',
                style: TextStyle(
                  color: _darkGreen,
                  fontWeight: FontWeight.w800,
                  height: 1.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MarketMapCard extends StatelessWidget {
  const _MarketMapCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                _IconBadge(icon: Icons.map_outlined, color: _green),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Peta status harga',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 170,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F2EC),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const Positioned(
                    top: 42,
                    left: 98,
                    child: _MapBubble(
                      label: 'Harga\nnormal',
                      color: Color(0xFF82D7A4),
                      size: 88,
                    ),
                  ),
                  const Positioned(
                    top: 28,
                    right: 55,
                    child: _MapBubble(
                      label: 'Perlu\npantau',
                      color: Color(0xFFFFC66B),
                      size: 76,
                    ),
                  ),
                  const Positioned(
                    bottom: 28,
                    left: 60,
                    child: _MapBubble(
                      label: 'Anomali',
                      color: Color(0xFFFF7378),
                      size: 68,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const Row(
              children: [
                _LegendDot(color: Color(0xFF82D7A4), label: 'Wajar'),
                SizedBox(width: 12),
                _LegendDot(color: Color(0xFFFFC66B), label: 'Pantau'),
                SizedBox(width: 12),
                _LegendDot(color: Color(0xFFFF7378), label: 'Anomali'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AuctionLiveCard extends StatelessWidget {
  const _AuctionLiveCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                _IconBadge(icon: Icons.bolt_outlined, color: _green),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Penawaran tertinggi',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
                Text(
                  '04:15',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const _BidRow(name: 'CV Maju Bersama', area: 'Surabaya', price: 6700),
            const _BidRow(name: 'UD Sumber Makmur', area: 'Tulungagung', price: 6500),
            const _BidRow(name: 'Pak Hendra', area: 'Kediri', price: 6400),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () {},
                    child: const Text('Terima pemenang'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () {},
                    child: const Text('Perpanjang'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BuyerJoinCard extends StatelessWidget {
  const _BuyerJoinCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Buka lelang baru',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            const _FieldLabel('Komoditas'),
            const TextField(decoration: InputDecoration(hintText: 'Padi GKP')),
            const SizedBox(height: 10),
            const _FieldLabel('Jumlah panen'),
            const TextField(
              keyboardType: TextInputType.number,
              decoration: InputDecoration(suffixText: 'kg', hintText: '500'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () {},
              child: const Text('Mulai lelang'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuctionNoteCard extends StatelessWidget {
  const _AuctionNoteCard();

  @override
  Widget build(BuildContext context) {
    return const _InfoCard(
      icon: Icons.verified_user_outlined,
      title: 'Pembeli terverifikasi',
      text:
          'Penawaran masuk dari pembeli yang sudah terdaftar agar transaksi lebih aman.',
    );
  }
}

class _DirectSaleCard extends StatelessWidget {
  const _DirectSaleCard({
    required this.title,
    required this.subtitle,
    required this.price,
    required this.quota,
  });

  final String title;
  final String subtitle;
  final int price;
  final double quota;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(color: _muted)),
            const SizedBox(height: 10),
            Text(
              '${_rupiah(price)}/kg',
              style: const TextStyle(
                fontSize: 20,
                color: _ink,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: quota,
                minHeight: 8,
                color: _green,
                backgroundColor: const Color(0xFFE6F3EC),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () {},
                    child: const Text('Pesan sekarang'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    child: const Text('Buat piutang'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              width: 92,
              height: 92,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFFDDF8E9),
              ),
              child: const Icon(Icons.agriculture_outlined,
                  color: _green, size: 42),
            ),
            const SizedBox(height: 10),
            const Text(
              'Mohammad Faiz',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const Text('Terverifikasi KTP - Sidoarjo',
                style: TextStyle(color: _muted)),
            const SizedBox(height: 14),
            const Row(
              children: [
                Expanded(child: _ProfileStat(label: 'Laporan', value: '47')),
                Expanded(child: _ProfileStat(label: 'Poin', value: '320')),
                Expanded(child: _ProfileStat(label: 'Rating', value: '4.9')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileSettings extends StatelessWidget {
  const _ProfileSettings();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(8),
        child: Column(
          children: [
            _SettingRow(icon: Icons.notifications_none, label: 'Notifikasi harga'),
            _SettingRow(icon: Icons.cloud_sync_outlined, label: 'Mode offline-first'),
            _SettingRow(icon: Icons.shield_outlined, label: 'Verifikasi KTP'),
            _SettingRow(icon: Icons.language_outlined, label: 'Bahasa'),
          ],
        ),
      ),
    );
  }
}

class _CompactPriceCard extends StatelessWidget {
  const _CompactPriceCard({
    required this.commodity,
    required this.district,
    required this.pricePerKg,
    required this.status,
  });

  final String commodity;
  final String district;
  final int pricePerKg;
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'LOW' => Colors.red,
      'HIGH' => const Color(0xFFE59616),
      _ => _green,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _line),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.grain_outlined, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  commodity,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  district,
                  style: const TextStyle(color: _muted, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${_rupiah(pricePerKg)}/kg',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 2),
              Text(
                status,
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LocationChip extends StatelessWidget {
  const _LocationChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: _line),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        children: [
          Icon(Icons.my_location, size: 18, color: _green),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Lokasi GPS aktif: Sidoarjo, Jawa Timur',
              style: TextStyle(fontWeight: FontWeight.w800, color: _darkGreen),
            ),
          ),
        ],
      ),
    );
  }
}

class _SegmentTabs extends StatelessWidget {
  const _SegmentTabs({required this.labels});

  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF5EF),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          for (var index = 0; index < labels.length; index++)
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: index == 0 ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Text(
                  labels[index],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: index == 0 ? _green : _muted,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionLabel,
    required this.onPressed,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: _sectionStyle),
        ),
        TextButton(onPressed: onPressed, child: Text(actionLabel)),
      ],
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFCFA),
        border: Border.all(color: _line),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: _muted, fontSize: 11)),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                color: accent,
                fontSize: 21,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeatherMetric extends StatelessWidget {
  const _WeatherMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFCFA),
        border: Border.all(color: _line),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: _green,
              fontSize: 10,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                color: _ink,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BidRow extends StatelessWidget {
  const _BidRow({
    required this.name,
    required this.area,
    required this.price,
  });

  final String name;
  final String area;
  final int price;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          const Icon(Icons.storefront_outlined, color: _green, size: 19),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w800)),
                Text(area, style: const TextStyle(color: _muted, fontSize: 12)),
              ],
            ),
          ),
          Text(
            _rupiah(price),
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}

class _CostRow extends StatelessWidget {
  const _CostRow({
    required this.label,
    required this.amount,
    this.isStrong = false,
  });

  final String label;
  final int amount;
  final bool isStrong;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: isStrong ? _ink : _muted,
                fontWeight: isStrong ? FontWeight.w900 : FontWeight.w600,
              ),
            ),
          ),
          Text(
            _rupiah(amount),
            style: TextStyle(
              color: isStrong ? _ink : _green,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _YieldRow extends StatelessWidget {
  const _YieldRow();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Hasil panen estimasi',
              style: TextStyle(color: _muted, fontWeight: FontWeight.w600),
            ),
          ),
          Text('500 kg', style: TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: _softGreen,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: _green)),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: const TextStyle(
                  color: _darkGreen,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 3),
            Text(caption, style: const TextStyle(color: _muted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _IconBadge extends StatelessWidget {
  const _IconBadge({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _MapBubble extends StatelessWidget {
  const _MapBubble({
    required this.label,
    required this.color,
    required this.size,
  });

  final String label;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.72),
        shape: BoxShape.circle,
      ),
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: _ink,
          fontWeight: FontWeight.w800,
          fontSize: 11,
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(color: _muted, fontSize: 12)),
      ],
    );
  }
}

class _ProfileStat extends StatelessWidget {
  const _ProfileStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: _green,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(label, style: const TextStyle(color: _muted, fontSize: 12)),
      ],
    );
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      secondary: Icon(icon, color: _green),
      value: label != 'Bahasa',
      onChanged: (_) {},
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      activeThumbColor: _green,
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: _softGreen,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(icon, color: _green),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 3),
                  Text(text, style: const TextStyle(color: _muted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: const TextStyle(
          color: _darkGreen,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _PriceSample {
  const _PriceSample({
    required this.commodity,
    required this.district,
    required this.pricePerKg,
    required this.referencePrice,
    required this.status,
    required this.band,
  });

  final String commodity;
  final String district;
  final int pricePerKg;
  final int referencePrice;
  final String status;
  final PriceBand band;
}

class _HppCost {
  const _HppCost(this.label, this.amount);

  final String label;
  final int amount;
}

const TextStyle _sectionStyle = TextStyle(
  color: _ink,
  fontSize: 16,
  fontWeight: FontWeight.w900,
);

String _rupiah(int value) {
  final text = value.toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (match) => '${match[1]}.',
      );
  return 'Rp$text';
}
