import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../wishlist/application/wishlist_providers.dart';
import '../data/product.dart';

class ProductCard extends ConsumerWidget {
  const ProductCard({super.key, required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOwnListing = product.sellerId == supabase.auth.currentUser?.id;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: SizedBox(
                width: double.infinity,
                child: product.coverImage != null
                    ? CachedNetworkImage(
                        imageUrl: product.coverImage!,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => const _ImagePlaceholder(),
                      )
                    : const _ImagePlaceholder(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontSize: 12.5, height: 1.15),
                  ),
                  if (product.location != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      product.location!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10.5, height: 1.1, color: AppColors.inkMute),
                    ),
                  ],
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '₦${product.price.toStringAsFixed(0)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'GeistMono',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      if (!isOwnListing) _WishlistButton(productId: product.id),
                    ],
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

class _WishlistButton extends ConsumerWidget {
  const _WishlistButton({required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wishlistedAsync = ref.watch(isWishlistedProvider(productId));

    return wishlistedAsync.when(
      loading: () => const _HeartIcon(filled: false, onTap: null),
      error: (error, stack) => const _HeartIcon(filled: false, onTap: null),
      data: (wishlisted) => _HeartIcon(
        filled: wishlisted,
        onTap: () async {
          final repo = ref.read(wishlistRepositoryProvider);
          if (wishlisted) {
            await repo.remove(productId);
          } else {
            await repo.add(productId);
          }
          ref.invalidate(isWishlistedProvider(productId));
          ref.invalidate(wishlistedProductsProvider);
        },
      ),
    );
  }
}

class _HeartIcon extends StatelessWidget {
  const _HeartIcon({required this.filled, required this.onTap});

  final bool filled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      customBorder: const CircleBorder(),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(
          filled ? Icons.favorite : Icons.favorite_border,
          size: 16,
          color: filled ? AppColors.accent : AppColors.inkMute,
        ),
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: AppColors.backgroundSunken,
      child: Icon(Icons.image_outlined, color: AppColors.inkMute),
    );
  }
}
