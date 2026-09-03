import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/skeletons.dart';
import '../catalog/application/catalog_providers.dart';
import '../catalog/data/product.dart';
import 'application/sell_providers.dart';

/// Mirrors app/listings/page.tsx — the seller's own listings dashboard,
/// with edit (blocked once sold, same as web) and delete actions.
class MyListingsScreen extends ConsumerWidget {
  const MyListingsScreen({super.key});

  Future<void> _delete(BuildContext context, WidgetRef ref, Product listing) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this listing?'),
        content: const Text("This can't be undone."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.destructive),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(sellRepositoryProvider).deleteProduct(listing.id);
      ref.invalidate(myListingsProvider);
      ref.invalidate(catalogProductsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listingsAsync = ref.watch(myListingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My listings')),
      body: listingsAsync.when(
        loading: () => const MyListingsSkeleton(),
        error: (error, stack) => const Center(child: Text("Couldn't load your listings")),
        data: (listings) {
          if (listings.isEmpty) {
            return const Center(
              child: Text("You haven't listed anything yet", style: TextStyle(color: AppColors.inkMute)),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myListingsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: listings.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final listing = listings[index];
                final canEdit = listing.status != 'sold';

                return Card(
                  clipBehavior: Clip.antiAlias,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: SizedBox(
                            width: 56,
                            height: 56,
                            child: listing.coverImage != null
                                ? CachedNetworkImage(imageUrl: listing.coverImage!, fit: BoxFit.cover)
                                : const ColoredBox(color: AppColors.backgroundSunken),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 4),
                              Text(
                                '₦${listing.price.toStringAsFixed(0)}',
                                style: const TextStyle(fontFamily: 'GeistMono', fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 6),
                              _StatusPill(status: listing.status),
                            ],
                          ),
                        ),
                        if (canEdit)
                          IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            onPressed: () => context.push('/my-listings/${listing.id}/edit'),
                          ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
                          onPressed: () => _delete(context, ref, listing),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    late final Color color;
    late final Color bg;
    switch (status) {
      case 'active':
        color = AppColors.primaryInk;
        bg = AppColors.primaryTint;
        break;
      case 'sold':
        color = AppColors.inkMute;
        bg = AppColors.backgroundSunken;
        break;
      default:
        color = AppColors.inkMute;
        bg = AppColors.backgroundSunken;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(status, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500)),
    );
  }
}
