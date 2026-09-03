import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kolejswap_mobile/core/theme/app_theme.dart';
import 'package:kolejswap_mobile/features/catalog/application/catalog_providers.dart';
import 'package:kolejswap_mobile/features/catalog/catalog_screen.dart';
import 'package:kolejswap_mobile/features/catalog/data/product.dart';

void main() {
  testWidgets('CatalogScreen renders search bar and category chips', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          catalogProductsProvider.overrideWith((ref) async => <Product>[]),
          promoSlidesProvider.overrideWith((ref) async => []),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const CatalogScreen(),
        ),
      ),
    );

    await tester.pump();

    // Verify search bar exists
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Search listings'), findsOneWidget);

    // Verify category chips exist
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Textbooks'), findsOneWidget);
    expect(find.text('Electronics'), findsOneWidget);
  });

  testWidgets('Tapping category chip updates category selection', (tester) async {
    final container = ProviderContainer(
      overrides: [
        catalogProductsProvider.overrideWith((ref) async => <Product>[]),
        promoSlidesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const CatalogScreen(),
        ),
      ),
    );

    await tester.pump();

    // Tap Textbooks chip (first occurrence, before section header text updates to 'Textbooks')
    await tester.tap(find.text('Textbooks').first);
    await tester.pump();

    expect(container.read(categoryFilterProvider), equals('textbooks'));

    // Tap Textbooks chip again to deselect
    await tester.tap(find.text('Textbooks').first);
    await tester.pump();

    expect(container.read(categoryFilterProvider), isNull);
  });

  testWidgets('Typing in search bar triggers debounce and updates searchQueryProvider', (tester) async {
    final container = ProviderContainer(
      overrides: [
        catalogProductsProvider.overrideWith((ref) async => <Product>[]),
        promoSlidesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const CatalogScreen(),
        ),
      ),
    );

    await tester.pump();

    // Enter search text
    await tester.enterText(find.byType(TextField), 'calculus');
    await tester.pump();

    // Before debounce (immediate)
    expect(container.read(searchQueryProvider), equals(''));

    // Advance 300ms for debounce
    await tester.pump(const Duration(milliseconds: 350));
    expect(container.read(searchQueryProvider), equals('calculus'));

    // Clear icon appears
    expect(find.byIcon(Icons.clear), findsOneWidget);
    await tester.tap(find.byIcon(Icons.clear));
    await tester.pump();

    expect(container.read(searchQueryProvider), equals(''));
  });
}
