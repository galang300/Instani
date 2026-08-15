import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:panganterkini_mobile/main.dart';

void main() {
  testWidgets('menampilkan beranda Instani', (tester) async {
    await tester.pumpWidget(const PanganTerkiniApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Instani'), findsOneWidget);
    expect(find.text('Ringkasan pasar hari ini'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Harga acuan terdekat'),
      240,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.text('Harga acuan terdekat'), findsOneWidget);
  });

  testWidgets('navigasi ke tab monitoring harga', (tester) async {
    await tester.pumpWidget(const PanganTerkiniApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.text('Harga'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Monitoring Harga'), findsOneWidget);
    expect(find.text('Peta status harga'), findsOneWidget);
    expect(find.text('Anomali'), findsWidgets);
  });
}
