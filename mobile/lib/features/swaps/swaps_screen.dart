import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/mobile_api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/skeletons.dart';
import 'application/swap_providers.dart';
import 'data/swap_models.dart';
import 'presentation/swap_status_badge.dart';

/// Mirrors app/swaps/page.tsx: received offers (I'm the seller, can
/// accept/decline) and sent offers (I'm the buyer, can cancel).
class SwapsScreen extends StatelessWidget {
  const SwapsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Swaps'),
          bottom: const TabBar(
            tabs: [Tab(text: 'Received'), Tab(text: 'Sent')],
          ),
        ),
        body: TabBarView(
          children: [
            _SwapList(
              provider: receivedSwapsProvider,
              role: _SwapRole.received,
              emptyMessage: 'No one has proposed a swap for your listings yet.',
            ),
            _SwapList(
              provider: sentSwapsProvider,
              role: _SwapRole.sent,
              emptyMessage: "You haven't proposed any swaps yet.",
            ),
          ],
        ),
      ),
    );
  }
}

enum _SwapRole { received, sent }

class _SwapList extends ConsumerWidget {
  const _SwapList({required this.provider, required this.role, required this.emptyMessage});

  final FutureProvider<List<SwapOffer>> provider;
  final _SwapRole role;
  final String emptyMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final swapsAsync = ref.watch(provider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(receivedSwapsProvider);
        ref.invalidate(sentSwapsProvider);
      },
      child: swapsAsync.when(
        loading: () => const SwapListSkeleton(),
        error: (error, stack) => ListView(
          children: const [
            SizedBox(height: 80),
            Center(child: Text("Couldn't load swap offers", style: TextStyle(color: AppColors.inkMute))),
          ],
        ),
        data: (offers) => offers.isEmpty
            ? ListView(
                children: [
                  const SizedBox(height: 80),
                  Center(child: Text(emptyMessage, style: const TextStyle(color: AppColors.inkMute))),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: offers.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) => _SwapCard(offer: offers[index], role: role),
              ),
      ),
    );
  }
}

class _SwapCard extends ConsumerStatefulWidget {
  const _SwapCard({required this.offer, required this.role});

  final SwapOffer offer;
  final _SwapRole role;

  @override
  ConsumerState<_SwapCard> createState() => _SwapCardState();
}

class _SwapCardState extends ConsumerState<_SwapCard> {
  bool _acting = false;

  void _refreshLists() {
    ref.invalidate(receivedSwapsProvider);
    ref.invalidate(sentSwapsProvider);
  }

  void _showResult(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _accept() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Accept this swap?'),
        content: const Text(
          'Both items will immediately be marked as sold, and any other pending offers on either item will be auto-declined. This cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes, accept')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _acting = true);
    try {
      await ref.read(swapRepositoryProvider).respond(widget.offer.id, 'accepted');
      _refreshLists();
      _showResult('Swap accepted! Both items are now marked as sold.');
    } on MobileApiException catch (e) {
      _showResult(e.message);
    } catch (_) {
      _showResult('Could not accept this offer. Please try again.');
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _decline() async {
    setState(() => _acting = true);
    try {
      await ref.read(swapRepositoryProvider).respond(widget.offer.id, 'declined');
      _refreshLists();
      _showResult('Offer declined.');
    } on MobileApiException catch (e) {
      _showResult(e.message);
    } catch (_) {
      _showResult('Could not decline this offer. Please try again.');
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _cancel() async {
    setState(() => _acting = true);
    try {
      await ref.read(swapRepositoryProvider).cancel(widget.offer.id);
      _refreshLists();
      _showResult('Swap offer cancelled.');
    } on MobileApiException catch (e) {
      _showResult(e.message);
    } catch (_) {
      _showResult('Could not cancel this offer. Please try again.');
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.role == _SwapRole.received
                        ? 'From ${offer.counterpartyName ?? 'Someone'}'
                        : 'To ${offer.counterpartyName ?? 'Someone'}',
                    style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, fontWeight: FontWeight.w500),
                  ),
                ),
                Text(
                  '${offer.createdAt.day}/${offer.createdAt.month}',
                  style: const TextStyle(fontFamily: 'GeistMono', fontSize: 11.5, color: AppColors.inkMute),
                ),
                const SizedBox(width: 8),
                SwapStatusBadge(status: offer.status),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _ProductThumb(product: offer.offeredProduct)),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.swap_horiz, size: 18, color: AppColors.inkMute),
                ),
                Expanded(child: _ProductThumb(product: offer.wantedProduct)),
              ],
            ),
            if (offer.cashTopup > 0) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryTint,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '+ ₦${offer.cashTopup.toStringAsFixed(0)} cash',
                  style: const TextStyle(
                    fontFamily: 'GeistMono',
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryInk,
                  ),
                ),
              ),
            ],
            if (offer.note != null && offer.note!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSunken,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '"${offer.note}"',
                  style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, fontStyle: FontStyle.italic),
                ),
              ),
            ],
            if (offer.isPending && widget.role == _SwapRole.received) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _acting ? null : _accept,
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('Accept'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _acting ? null : _decline,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.destructive,
                        side: const BorderSide(color: AppColors.destructive),
                      ),
                      icon: const Icon(Icons.cancel_outlined, size: 16),
                      label: const Text('Decline'),
                    ),
                  ),
                ],
              ),
            ],
            if (offer.isPending && widget.role == _SwapRole.sent) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _acting ? null : _cancel,
                  icon: const Icon(Icons.block, size: 16),
                  label: const Text('Cancel offer'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ProductThumb extends StatelessWidget {
  const _ProductThumb({required this.product});

  final SwapProductRef? product;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            width: 36,
            height: 36,
            child: product?.image != null
                ? CachedNetworkImage(imageUrl: product!.image!, fit: BoxFit.cover)
                : const ColoredBox(
                    color: AppColors.backgroundSunken,
                    child: Icon(Icons.tag_outlined, size: 16, color: AppColors.inkMute),
                  ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            product?.title ?? 'Deleted listing',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}
