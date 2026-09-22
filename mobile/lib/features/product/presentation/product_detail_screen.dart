import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeletons.dart';
import '../../catalog/data/product.dart';
import '../../chat/application/chat_providers.dart';
import '../../chat/data/chat_repository.dart';
import '../../checkout/data/checkout_repository.dart';
import '../../reviews/presentation/seller_rating_badge.dart';
import '../../safety/data/models.dart' as safety;
import '../../safety/presentation/report_sheet.dart';
import '../../wishlist/application/wishlist_providers.dart';
import '../application/product_detail_providers.dart';
import 'product_image_gallery.dart';

final _checkoutRepositoryProvider = Provider((ref) => CheckoutRepository());

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  bool _messaging = false;
  bool _buying = false;

  Future<void> _buyNow(Product product) async {
    if (_buying) return;
    setState(() => _buying = true);
    try {
      final checkoutUrl = await ref.read(_checkoutRepositoryProvider).initCheckout(product.id);
      if (!mounted) return;
      final completed = await context.push<bool>('/checkout', extra: checkoutUrl);
      if (completed == true && mounted) context.push('/orders');
    } on MobileApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not start checkout. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _buying = false);
    }
  }

  Future<void> _messageSeller(Product product) async {
    if (_messaging) return;
    setState(() => _messaging = true);
    try {
      final conversationId = await ref.read(chatRepositoryProvider).openConversation(
            productId: product.id,
            sellerId: product.sellerId,
          );
      if (mounted) context.push('/messages/$conversationId');
    } on ChatBlockedException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open conversation. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _messaging = false);
    }
  }

  Future<void> _toggleWishlist(String productId, bool currentlyWishlisted) async {
    final repo = ref.read(wishlistRepositoryProvider);
    if (currentlyWishlisted) {
      await repo.remove(productId);
    } else {
      await repo.add(productId);
    }
    ref.invalidate(isWishlistedProvider(productId));
    ref.invalidate(wishlistedProductsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productDetailProvider(widget.productId));
    final myId = supabase.auth.currentUser?.id;

    return Scaffold(
      body: productAsync.when(
        loading: () => const ProductDetailSkeleton(),
        error: (error, stack) => const Center(child: Text("Couldn't load this listing")),
        data: (product) {
          final isOwnListing = product.sellerId == myId;
          final wishlistedAsync = ref.watch(isWishlistedProvider(product.id));

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 280,
                backgroundColor: AppColors.background,
                foregroundColor: AppColors.ink,
                flexibleSpace: FlexibleSpaceBar(
                  background: ProductImageGallery(images: product.images),
                ),
                actions: [
                  if (!isOwnListing)
                    wishlistedAsync.when(
                      loading: () => const SizedBox.shrink(),
                      error: (error, stack) => const SizedBox.shrink(),
                      data: (wishlisted) => IconButton(
                        icon: Icon(wishlisted ? Icons.favorite : Icons.favorite_border),
                        onPressed: () => _toggleWishlist(product.id, wishlisted),
                      ),
                    ),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.title, style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 6),
                      Text(
                        '₦${product.price.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontFamily: 'GeistMono',
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: [
                          if (product.category != null) _Tag(productCategories[product.category] ?? product.category!),
                          if (product.condition != null) _Tag(product.condition!),
                          if (product.location != null) _Tag(product.location!, icon: Icons.place_outlined),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Text(product.description, style: Theme.of(context).textTheme.bodyLarge),
                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 12),
                      Text('Seller', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 4),
                      Text(
                        [product.sellerName, product.sellerUniversity].whereType<String>().join(' · '),
                        style: const TextStyle(color: AppColors.inkMute),
                      ),
                      const SizedBox(height: 6),
                      SellerRatingBadge(sellerId: product.sellerId),
                      const SizedBox(height: 24),
                      if (!isOwnListing && product.status == 'active') ...[
                        ElevatedButton.icon(
                          onPressed: _buying ? null : () => _buyNow(product),
                          icon: const Icon(Icons.shopping_bag_outlined),
                          label: Text(_buying ? 'Starting checkout…' : 'Buy now — escrow protected'),
                        ),
                        const SizedBox(height: 10),
                      ],
                      if (!isOwnListing &&
                          product.status == 'active' &&
                          (product.openTo == 'cash-or-swap' || product.openTo == 'swap-only')) ...[
                        OutlinedButton.icon(
                          onPressed: () => context.push('/swaps/propose/${product.id}'),
                          icon: const Icon(Icons.swap_horiz),
                          label: const Text('Propose a swap'),
                        ),
                        const SizedBox(height: 10),
                      ],
                      if (!isOwnListing && product.status != 'active')
                        const Padding(
                          padding: EdgeInsets.only(bottom: 10),
                          child: Text('This item is no longer available', style: TextStyle(color: AppColors.inkMute)),
                        ),
                      if (!isOwnListing)
                        OutlinedButton.icon(
                          onPressed: _messaging ? null : () => _messageSeller(product),
                          icon: const Icon(Icons.chat_bubble_outline),
                          label: Text(_messaging ? 'Opening…' : 'Message seller'),
                        ),
                      // Reporting a listing is separate from disputing an
                      // order: this is for content that breaks the rules, not
                      // for a deal gone wrong.
                      if (!isOwnListing && myId != null) ...[
                        const SizedBox(height: 18),
                        Center(
                          child: TextButton.icon(
                            onPressed: () => showReportSheet(
                              context,
                              targetType: safety.ReportTargetType.product,
                              targetId: product.id,
                              subject: product.title,
                              blockUserId: product.sellerId,
                              blockUserName: product.sellerName ?? 'this seller',
                            ),
                            icon: const Icon(Icons.flag_outlined, size: 15),
                            label: const Text('Report this listing'),
                            style: TextButton.styleFrom(foregroundColor: AppColors.inkMute),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label, {this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primaryTint,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: AppColors.primaryInk), const SizedBox(width: 4)],
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.primaryInk)),
        ],
      ),
    );
  }
}
