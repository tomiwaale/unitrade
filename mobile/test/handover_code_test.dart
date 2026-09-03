import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kolejswap_mobile/core/theme/app_theme.dart';
import 'package:kolejswap_mobile/features/orders/presentation/handover_screen.dart';
import 'package:qr_flutter/qr_flutter.dart';

void main() {
  const orderId = '3f1c9a4e-2b6d-4a91-9d0e-77c1b0a5e412';

  group('generateHandoverOtp', () {
    test('is six digits', () {
      expect(generateHandoverOtp(orderId), matches(RegExp(r'^\d{6}$')));
    });

    test('is stable for the same order on the same day', () {
      // The buyer's device and the seller's device compute it independently;
      // if these ever disagree the handover cannot complete.
      expect(generateHandoverOtp(orderId), generateHandoverOtp(orderId));
    });

    test('differs between orders', () {
      expect(
        generateHandoverOtp(orderId),
        isNot(generateHandoverOtp('0000aaaa-2b6d-4a91-9d0e-77c1b0a5e412')),
      );
    });

    test('pads codes that hash below 100000', () {
      // Brute-force a seed landing in the short range rather than asserting
      // on a hardcoded one, so the test survives a hash change.
      for (var i = 0; i < 20000; i++) {
        final otp = generateHandoverOtp('order-$i');
        expect(otp.length, 6, reason: 'order-$i produced "$otp"');
      }
    });
  });

  test('handoverQrPayload carries the order and the code', () {
    final otp = generateHandoverOtp(orderId);
    expect(handoverQrPayload(orderId, otp), 'kolejswap:handover:$orderId:$otp');
  });

  testWidgets('HandoverScreen shows a QR plus the grouped code', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const HandoverScreen(orderId: orderId, productTitle: 'Casio FX-991'),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    final otp = generateHandoverOtp(orderId);
    expect(find.byType(QrImageView), findsOneWidget);
    expect(find.text('${otp.substring(0, 3)} ${otp.substring(3)}'), findsOneWidget);
    expect(find.textContaining('Casio FX-991'), findsOneWidget);
    // The seller holds this screen; the buyer types the code.
    expect(find.textContaining('Show this screen to the buyer'), findsOneWidget);
  });
}
