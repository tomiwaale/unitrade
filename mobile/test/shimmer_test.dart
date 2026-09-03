import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kolejswap_mobile/core/theme/app_theme.dart';
import 'package:kolejswap_mobile/core/widgets/shimmer.dart';
import 'package:kolejswap_mobile/core/widgets/skeletons.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: child),
  );
}

void main() {
  group('Shimmer base widgets', () {
    testWidgets('Shimmer and ShimmerBox render correctly and animate', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const Shimmer(
            child: ShimmerBox(width: 100, height: 20),
          ),
        ),
      );

      expect(find.byType(Shimmer), findsOneWidget);
      expect(find.byType(ShimmerBox), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 200));
      expect(tester.takeException(), isNull);
    });

    testWidgets('ShimmerCircle renders with appropriate radius', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const Shimmer(
            child: ShimmerCircle(radius: 24),
          ),
        ),
      );

      final box = tester.renderObject<RenderBox>(find.byType(ShimmerCircle));
      expect(box.size.width, equals(48));
      expect(box.size.height, equals(48));
    });
  });

  group('Domain Skeletons', () {
    testWidgets('CatalogGridSkeleton renders cards inside CustomScrollView', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const CustomScrollView(
            slivers: [
              CatalogGridSkeleton(itemCount: 4),
            ],
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(ProductCardSkeleton), findsNWidgets(4));
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChatListSkeleton renders expected chat row placeholders', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatListSkeleton(itemCount: 3),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(ChatTileSkeleton), findsNWidgets(3));
      expect(tester.takeException(), isNull);
    });

    testWidgets('OrderListSkeleton and SwapListSkeleton render card items', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const OrderListSkeleton(itemCount: 2),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(OrderCardSkeleton), findsNWidgets(2));

      await tester.pumpWidget(
        _wrap(
          const SwapListSkeleton(itemCount: 2),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(SwapCardSkeleton), findsNWidgets(2));
      expect(tester.takeException(), isNull);
    });

    testWidgets('MyListingsSkeleton renders card items', (tester) async {
      await tester.pumpWidget(_wrap(const MyListingsSkeleton(itemCount: 2)));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(MyListingCardSkeleton), findsNWidgets(2));
      expect(tester.takeException(), isNull);
    });

    testWidgets('NotificationListSkeleton renders without errors', (tester) async {
      await tester.pumpWidget(_wrap(const NotificationListSkeleton(itemCount: 3)));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(NotificationListSkeleton), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('WishlistListSkeleton renders without errors', (tester) async {
      await tester.pumpWidget(_wrap(const WishlistListSkeleton(itemCount: 2)));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(WishlistListSkeleton), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ProductDetailSkeleton renders without errors', (tester) async {
      await tester.pumpWidget(_wrap(const ProductDetailSkeleton()));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(ProductDetailSkeleton), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
