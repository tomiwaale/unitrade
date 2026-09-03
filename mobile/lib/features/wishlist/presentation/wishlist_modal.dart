import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeletons.dart';
import '../../catalog/data/product.dart';
import '../application/wishlist_providers.dart';

/// Bottom sheet listing the caller's saved products. There's no equivalent
/// on web (it only toggles wishlist state inline on the catalog grid) — this
/// is a mobile-only "view my wishlist" surface.
class WishlistModal {
  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const _WishlistSheet(),
    );
  }
}

class _WishlistSheet extends ConsumerWidget {
  const _WishlistSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wishlistAsync = ref.watch(wishlistedProductsProvider);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 12, 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Wishlist', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: wishlistAsync.when(
                  loading: () => const WishlistListSkeleton(),
                  error: (error, stack) => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(child: Text("Couldn't load your wishlist")),
                  ),
                  data: (products) => products.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 40, horizontal: 24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.favorite_border, size: 28, color: AppColors.inkMute),
                              SizedBox(height: 10),
                              Text('Nothing saved yet', style: TextStyle(fontWeight: FontWeight.w500)),
                              SizedBox(height: 4),
                              Text(
                                'Tap the heart on any listing to save it here.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppColors.inkMute, fontSize: 12.5),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
                          itemCount: products.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 4),
                          itemBuilder: (context, index) => _WishlistRow(product: products[index]),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WishlistRow extends ConsumerWidget {
  const _WishlistRow({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8),
      onTap: () {
        Navigator.pop(context);
        context.push('/product/${product.id}');
      },
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 48,
          height: 48,
          child: product.coverImage != null
              ? CachedNetworkImage(imageUrl: product.coverImage!, fit: BoxFit.cover)
              : const ColoredBox(color: AppColors.backgroundSunken),
        ),
      ),
      title: Text(product.title, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(
        '₦${product.price.toStringAsFixed(0)}',
        style: const TextStyle(fontFamily: 'GeistMono', color: AppColors.inkMute, fontSize: 12.5),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.favorite, color: AppColors.accent),
        onPressed: () async {
          await ref.read(wishlistRepositoryProvider).remove(product.id);
          ref.invalidate(wishlistedProductsProvider);
        },
      ),
    );
  }
}
