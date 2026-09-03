import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import 'shimmer.dart';

// ============================================================================
// Catalog Skeletons
// ============================================================================

/// Skeleton placeholder for a single ProductCard in the catalog grid.
class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Expanded(
            child: ShimmerBox(
              width: double.infinity,
              height: double.infinity,
              borderRadius: BorderRadius.zero,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerBox(width: 90, height: 12),
                const SizedBox(height: 4),
                const ShimmerBox(width: 60, height: 10),
                const SizedBox(height: 5),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    ShimmerBox(width: 48, height: 13),
                    ShimmerCircle(radius: 8),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sliver skeleton grid of ProductCardSkeleton items for the catalog screen sliver.
class CatalogGridSkeleton extends StatelessWidget {
  const CatalogGridSkeleton({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) => const Shimmer(child: ProductCardSkeleton()),
          childCount: itemCount,
        ),
      ),
    );
  }
}

// ============================================================================
// Chat Skeletons
// ============================================================================

/// Skeleton row placeholder for ChatListScreen.
class ChatTileSkeleton extends StatelessWidget {
  const ChatTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          ShimmerCircle(radius: 20),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 120, height: 14),
                SizedBox(height: 6),
                ShimmerBox(width: 180, height: 12),
              ],
            ),
          ),
          SizedBox(width: 8),
          ShimmerBox(width: 32, height: 10),
        ],
      ),
    );
  }
}

/// Full list skeleton for ChatListScreen.
class ChatListSkeleton extends StatelessWidget {
  const ChatListSkeleton({super.key, this.itemCount = 7});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) => const ChatTileSkeleton(),
      ),
    );
  }
}

// ============================================================================
// Order Skeletons
// ============================================================================

/// Skeleton card for OrdersScreen.
class OrderCardSkeleton extends StatelessWidget {
  const OrderCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const ShimmerBox(width: 52, height: 52, borderRadius: BorderRadius.all(Radius.circular(10))),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(width: 140, height: 14),
                  SizedBox(height: 6),
                  ShimmerBox(width: 90, height: 11),
                  SizedBox(height: 6),
                  ShimmerBox(width: 60, height: 13),
                ],
              ),
            ),
            const ShimmerBox(width: 70, height: 22, borderRadius: BorderRadius.all(Radius.circular(20))),
          ],
        ),
      ),
    );
  }
}

/// Full list skeleton for OrdersScreen.
class OrderListSkeleton extends StatelessWidget {
  const OrderListSkeleton({super.key, this.itemCount = 5});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) => const OrderCardSkeleton(),
      ),
    );
  }
}

// ============================================================================
// Swap Skeletons
// ============================================================================

/// Skeleton card for SwapsScreen.
class SwapCardSkeleton extends StatelessWidget {
  const SwapCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                ShimmerBox(width: 120, height: 13),
                ShimmerBox(width: 65, height: 20, borderRadius: BorderRadius.all(Radius.circular(20))),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: const [
                ShimmerBox(width: 36, height: 36, borderRadius: BorderRadius.all(Radius.circular(8))),
                SizedBox(width: 8),
                Expanded(child: ShimmerBox(height: 13)),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.swap_horiz, size: 18, color: AppColors.line),
                ),
                ShimmerBox(width: 36, height: 36, borderRadius: BorderRadius.all(Radius.circular(8))),
                SizedBox(width: 8),
                Expanded(child: ShimmerBox(height: 13)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Full list skeleton for SwapsScreen.
class SwapListSkeleton extends StatelessWidget {
  const SwapListSkeleton({super.key, this.itemCount = 4});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) => const SwapCardSkeleton(),
      ),
    );
  }
}

// ============================================================================
// My Listings Skeletons
// ============================================================================

/// Skeleton card for MyListingsScreen.
class MyListingCardSkeleton extends StatelessWidget {
  const MyListingCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: const [
            ShimmerBox(width: 56, height: 56, borderRadius: BorderRadius.all(Radius.circular(10))),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(width: 130, height: 14),
                  SizedBox(height: 6),
                  ShimmerBox(width: 60, height: 13),
                  SizedBox(height: 6),
                  ShimmerBox(width: 50, height: 18, borderRadius: BorderRadius.all(Radius.circular(20))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Full list skeleton for MyListingsScreen.
class MyListingsSkeleton extends StatelessWidget {
  const MyListingsSkeleton({super.key, this.itemCount = 4});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) => const MyListingCardSkeleton(),
      ),
    );
  }
}

// ============================================================================
// Notification Skeletons
// ============================================================================

/// Full list skeleton for NotificationsScreen.
class NotificationListSkeleton extends StatelessWidget {
  const NotificationListSkeleton({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) => const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              ShimmerCircle(radius: 20),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ShimmerBox(width: 150, height: 14),
                    SizedBox(height: 6),
                    ShimmerBox(width: 220, height: 12),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Wishlist Skeletons
// ============================================================================

/// Full list skeleton for WishlistModal bottom sheet.
class WishlistListSkeleton extends StatelessWidget {
  const WishlistListSkeleton({super.key, this.itemCount = 3});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const SizedBox(height: 4),
        itemBuilder: (context, index) => const Padding(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              ShimmerBox(width: 48, height: 48, borderRadius: BorderRadius.all(Radius.circular(8))),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ShimmerBox(width: 130, height: 14),
                    SizedBox(height: 6),
                    ShimmerBox(width: 60, height: 12),
                  ],
                ),
              ),
              ShimmerCircle(radius: 12),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Product Detail Skeleton
// ============================================================================

/// Skeleton placeholder for ProductDetailScreen.
class ProductDetailSkeleton extends StatelessWidget {
  const ProductDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView(
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: [
          const ShimmerBox(width: double.infinity, height: 280, borderRadius: BorderRadius.zero),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                ShimmerBox(width: 220, height: 24),
                SizedBox(height: 10),
                ShimmerBox(width: 100, height: 20),
                SizedBox(height: 16),
                Row(
                  children: [
                    ShimmerBox(width: 70, height: 26, borderRadius: BorderRadius.all(Radius.circular(20))),
                    SizedBox(width: 8),
                    ShimmerBox(width: 60, height: 26, borderRadius: BorderRadius.all(Radius.circular(20))),
                  ],
                ),
                SizedBox(height: 24),
                ShimmerBox(width: double.infinity, height: 14),
                SizedBox(height: 8),
                ShimmerBox(width: double.infinity, height: 14),
                SizedBox(height: 8),
                ShimmerBox(width: 180, height: 14),
                SizedBox(height: 24),
                Divider(),
                SizedBox(height: 16),
                ShimmerBox(width: 80, height: 16),
                SizedBox(height: 8),
                ShimmerBox(width: 150, height: 13),
                SizedBox(height: 24),
                ShimmerBox(width: double.infinity, height: 44, borderRadius: BorderRadius.all(Radius.circular(10))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
