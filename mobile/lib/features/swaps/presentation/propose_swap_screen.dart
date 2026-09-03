import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/mobile_api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../catalog/data/product.dart';
import '../../product/application/product_detail_providers.dart';
import '../application/swap_providers.dart';

/// Mirrors app/product/[id]/propose-swap-btn.tsx as a routed screen instead
/// of a bottom-sheet modal — this app pushes a dedicated screen for every
/// multi-field flow (checkout, KYC) rather than using modals.
class ProposeSwapScreen extends ConsumerStatefulWidget {
  const ProposeSwapScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProposeSwapScreen> createState() => _ProposeSwapScreenState();
}

class _ProposeSwapScreenState extends ConsumerState<ProposeSwapScreen> {
  final _cashController = TextEditingController();
  final _noteController = TextEditingController();
  String? _selectedListingId;
  bool _submitting = false;

  @override
  void dispose() {
    _cashController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedListingId == null || _submitting) return;
    setState(() => _submitting = true);
    try {
      final cashTopup = double.tryParse(_cashController.text.trim());
      await ref.read(swapRepositoryProvider).propose(
            wantedProductId: widget.productId,
            offeredProductId: _selectedListingId!,
            note: _noteController.text.trim(),
            cashTopup: cashTopup,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Swap offer sent!')),
        );
        context.go('/swaps');
      }
    } on MobileApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not send swap offer. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productDetailProvider(widget.productId));
    final listingsAsync = ref.watch(myActiveListingsForSwapProvider(widget.productId));

    return Scaffold(
      appBar: AppBar(
        title: Text(
          productAsync.maybeWhen(
            data: (product) => 'Offer a swap for "${product.title}"',
            orElse: () => 'Offer a swap',
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'WHICH OF YOUR LISTINGS ARE YOU OFFERING?',
            style: TextStyle(
              fontFamily: 'GeistMono',
              fontSize: 11,
              letterSpacing: 0.5,
              color: AppColors.inkMute,
            ),
          ),
          const SizedBox(height: 10),
          listingsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 28),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, stack) => const Padding(
              padding: EdgeInsets.symmetric(vertical: 28),
              child: Center(child: Text("Couldn't load your listings")),
            ),
            data: (listings) => listings.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSunken,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.inventory_2_outlined, color: AppColors.inkMute, size: 26),
                        SizedBox(height: 8),
                        Text(
                          'No active listings to offer',
                          style: TextStyle(fontWeight: FontWeight.w500),
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 4),
                        Text(
                          'List an item first, then come back to propose a swap.',
                          style: TextStyle(color: AppColors.inkMute, fontSize: 12.5),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      for (final listing in listings) _ListingTile(
                        product: listing,
                        selected: listing.id == _selectedListingId,
                        onTap: () => setState(
                          () => _selectedListingId = listing.id == _selectedListingId ? null : listing.id,
                        ),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 24),
          const Text(
            'ADD CASH ON TOP (OPTIONAL)',
            style: TextStyle(fontFamily: 'GeistMono', fontSize: 11, letterSpacing: 0.5, color: AppColors.inkMute),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _cashController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(prefixText: '₦', hintText: '0'),
          ),
          const SizedBox(height: 4),
          const Text('Paid in cash at the time of handoff.', style: TextStyle(color: AppColors.inkMute, fontSize: 11.5)),
          const SizedBox(height: 20),
          const Text(
            'ADD A NOTE (OPTIONAL)',
            style: TextStyle(fontFamily: 'GeistMono', fontSize: 11, letterSpacing: 0.5, color: AppColors.inkMute),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _noteController,
            maxLines: 2,
            decoration: const InputDecoration(hintText: "Condition details, why it's a fair trade…"),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _selectedListingId == null || _submitting ? null : _submit,
            icon: const Icon(Icons.swap_horiz),
            label: Text(_submitting ? 'Sending offer…' : 'Send swap offer'),
          ),
        ],
      ),
    );
  }
}

class _ListingTile extends StatelessWidget {
  const _ListingTile({required this.product, required this.selected, required this.onTap});

  final Product product;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? AppColors.primary : AppColors.line, width: 1.5),
            color: selected ? AppColors.primaryTint : AppColors.background,
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: product.coverImage != null
                      ? CachedNetworkImage(imageUrl: product.coverImage!, fit: BoxFit.cover)
                      : const ColoredBox(color: AppColors.backgroundSunken),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13.5)),
                    Text('₦${product.price.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.inkMute)),
                  ],
                ),
              ),
              if (selected) const Icon(Icons.check, color: AppColors.primaryInk, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
