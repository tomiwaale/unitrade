import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kolejswap_mobile/core/theme/app_theme.dart';
import 'package:kolejswap_mobile/features/product/presentation/fullscreen_image_viewer.dart';
import 'package:kolejswap_mobile/features/product/presentation/product_image_gallery.dart';

void main() {
  testWidgets('FullScreenImageViewer renders InteractiveViewer and counter for multi-images', (tester) async {
    final images = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: FullScreenImageViewer(images: images),
      ),
    );

    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(InteractiveViewer), findsOneWidget);
    expect(find.text('1 / 2'), findsOneWidget);
    expect(find.byIcon(Icons.close), findsOneWidget);
  });

  testWidgets('ProductImageGallery displays images and tap triggers FullScreenImageViewer', (tester) async {
    final images = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            height: 300,
            width: 400,
            child: ProductImageGallery(images: images),
          ),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(ProductImageGallery), findsOneWidget);

    // Tap to open full screen viewer
    await tester.tap(find.byType(GestureDetector).first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400)); // Wait for route push transition

    expect(find.byType(FullScreenImageViewer), findsOneWidget);
    expect(find.text('1 / 2'), findsOneWidget);

    // Tap close
    await tester.tap(find.byIcon(Icons.close));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600)); // Wait for route pop transition

    expect(find.byType(FullScreenImageViewer), findsNothing);
  });
}
