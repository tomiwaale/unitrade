import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/review_providers.dart';

/// Star + average rating, mirroring the inline rating block on
/// app/product/[id]/page.tsx and the profile stat tile on app/profile/page.tsx.
class SellerRatingBadge extends ConsumerWidget {
  const SellerRatingBadge({super.key, required this.sellerId});

  final String sellerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ratingAsync = ref.watch(sellerRatingProvider(sellerId));

    return ratingAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (error, stack) => const SizedBox.shrink(),
      data: (summary) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star, size: 15, color: summary.average != null ? Colors.amber : AppColors.inkMute),
          const SizedBox(width: 4),
          Text(
            summary.average != null
                ? '${summary.average!.toStringAsFixed(1)} (${summary.count})'
                : 'No reviews yet',
            style: const TextStyle(fontSize: 12.5, color: AppColors.inkMute),
          ),
        ],
      ),
    );
  }
}
