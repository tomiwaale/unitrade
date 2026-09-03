import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../reviews/presentation/leave_review_card.dart';
import '../application/order_providers.dart';
import '../data/order_models.dart';
import 'dispute_modal.dart';
import 'handover_confirm_sheet.dart';
import 'handover_screen.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  Future<void> _confirmHandover(OrderDetail order) async {
    await showHandoverConfirmSheet(
      context,
      orderId: order.id,
      productTitle: order.productTitle,
    );
  }

  Future<void> _showHandoverCode(OrderDetail order) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => HandoverScreen(orderId: order.id, productTitle: order.productTitle),
      ),
    );
  }

  Future<void> _dispute() async {
    await showDisputeModal(context, orderId: widget.orderId);
    ref.invalidate(orderDetailProvider(widget.orderId));
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(orderDetailProvider(widget.orderId));
    final myId = supabase.auth.currentUser?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => const Center(child: Text("Couldn't load this order")),
        data: (order) {
          final isBuyer = order.buyerId == myId;
          final isSeller = order.sellerId == myId;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: SizedBox(
                              width: 60,
                              height: 60,
                              child: order.productImage != null
                                  ? CachedNetworkImage(imageUrl: order.productImage!, fit: BoxFit.cover)
                                  : const ColoredBox(color: AppColors.backgroundSunken),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(order.productTitle ?? 'Deleted product',
                                    style: const TextStyle(fontWeight: FontWeight.w500)),
                                const SizedBox(height: 4),
                                Text(
                                  '₦${order.amount.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontFamily: 'GeistMono',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                  ),
                                ),
                                if (order.sellerName != null)
                                  Text(
                                    '${order.sellerName} · ${order.sellerUniversity ?? ''}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.inkMute),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    _EscrowStatusBox(order: order, isBuyer: isBuyer),
                  ],
                ),
              ),
              if (isBuyer && order.status == 'paid') ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _confirmHandover(order),
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Enter handover code'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _dispute,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.destructive,
                          side: const BorderSide(color: AppColors.destructive),
                        ),
                        icon: const Icon(Icons.report_problem_outlined),
                        label: const Text('Report'),
                      ),
                    ),
                  ],
                ),
              ],
              if (isSeller && order.status == 'paid') ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _showHandoverCode(order),
                    icon: const Icon(Icons.qr_code_2),
                    label: const Text('Show handover code'),
                  ),
                ),
              ],
              if (isBuyer && order.status == 'confirmed' && !order.hasReview) ...[
                const SizedBox(height: 16),
                LeaveReviewCard(
                  orderId: order.id,
                  onSubmitted: () => ref.invalidate(orderDetailProvider(widget.orderId)),
                ),
              ],
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Order details', style: TextStyle(color: AppColors.inkMute, fontSize: 12)),
                      const SizedBox(height: 10),
                      _MetaRow(label: 'Order ID', value: order.id.substring(0, 12).toUpperCase()),
                      _MetaRow(label: 'Amount paid', value: '₦${order.amount.toStringAsFixed(0)}'),
                      if (isSeller)
                        _MetaRow(label: 'Your payout (90%)', value: '₦${order.sellerPayout.toStringAsFixed(0)}'),
                      _MetaRow(
                        label: 'Date',
                        value: '${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}',
                      ),
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

class _EscrowStatusBox extends StatelessWidget {
  const _EscrowStatusBox({required this.order, required this.isBuyer});

  final OrderDetail order;
  final bool isBuyer;

  @override
  Widget build(BuildContext context) {
    late final IconData icon;
    late final Color color;
    late final Color bg;
    late final String title;
    late final String body;

    switch (order.status) {
      case 'pending':
        icon = Icons.schedule;
        color = AppColors.inkSoft;
        bg = AppColors.backgroundSunken;
        title = 'Payment pending';
        body = 'Waiting for payment to be confirmed.';
        break;
      case 'paid':
        icon = Icons.shield_outlined;
        color = AppColors.primaryInk;
        bg = AppColors.primaryTint;
        title = 'Funds held in escrow';
        final payout = '₦${order.sellerPayout.toStringAsFixed(0)}';
        final release = order.autoReleaseAt != null
            ? ' Auto-releases on ${order.autoReleaseAt!.day}/${order.autoReleaseAt!.month}.'
            : '';
        body = isBuyer
            ? '$payout is locked safely. When you collect the item, enter the code on the seller\'s screen to release payment.$release'
            : 'Buyer has paid. Show them your handover code when you hand the item over — entering it releases your payment.$release';
        break;
      case 'confirmed':
        icon = Icons.check_circle_outline;
        color = AppColors.primaryInk;
        bg = AppColors.primaryTint;
        title = 'Completed';
        body = isBuyer
            ? 'You confirmed receipt. ₦${order.sellerPayout.toStringAsFixed(0)} sent to seller.'
            : 'Buyer confirmed receipt. ₦${order.sellerPayout.toStringAsFixed(0)} has been sent to your account.';
        break;
      case 'disputed':
        icon = Icons.warning_amber_outlined;
        color = const Color(0xFF8B0000);
        bg = const Color(0xFFFDEAEA);
        title = 'Dispute filed';
        body = isBuyer
            ? 'Your dispute was received. Payment is frozen — our team will contact you.'
            : 'The buyer has raised a dispute. Payment is frozen while we review.';
        break;
      default:
        return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: bg,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: color)),
                const SizedBox(height: 4),
                Text(body, style: TextStyle(fontSize: 13, color: color.withValues(alpha: 0.85), height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkMute, fontSize: 13.5)),
          Text(value, style: const TextStyle(fontFamily: 'GeistMono', fontWeight: FontWeight.w500, fontSize: 13.5)),
        ],
      ),
    );
  }
}
