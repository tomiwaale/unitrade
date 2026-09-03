import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/skeletons.dart';
import 'application/order_providers.dart';
import 'data/order_models.dart';
import 'presentation/order_status_badge.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Orders'),
          bottom: const TabBar(
            tabs: [Tab(text: 'Buying'), Tab(text: 'Selling')],
          ),
        ),
        body: TabBarView(
          children: [
            _OrderList(
              provider: purchasesProvider,
              emptyMessage: "You haven't bought anything yet.",
            ),
            _OrderList(
              provider: salesProvider,
              emptyMessage: "You haven't sold anything yet.",
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({required this.provider, required this.emptyMessage});

  final FutureProvider<List<OrderSummary>> provider;
  final String emptyMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(provider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(provider),
      child: ordersAsync.when(
        loading: () => const OrderListSkeleton(),
        error: (error, stack) => ListView(
          children: const [
            SizedBox(height: 80),
            Center(child: Text("Couldn't load orders", style: TextStyle(color: AppColors.inkMute))),
          ],
        ),
        data: (orders) => orders.isEmpty
            ? ListView(
                children: [
                  const SizedBox(height: 80),
                  Center(child: Text(emptyMessage, style: const TextStyle(color: AppColors.inkMute))),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: orders.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final OrderSummary order = orders[index];
                  return _OrderRow(order: order);
                },
              ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order});

  final OrderSummary order;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/orders/${order.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: order.productImage != null
                      ? CachedNetworkImage(imageUrl: order.productImage!, fit: BoxFit.cover)
                      : const ColoredBox(
                          color: AppColors.backgroundSunken,
                          child: Icon(Icons.tag_outlined, color: AppColors.inkMute),
                        ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.productTitle ?? 'Deleted product',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                    ),
                    if (order.counterpartyName != null)
                      Text(
                        'Buyer: ${order.counterpartyName}',
                        style: const TextStyle(fontSize: 12, color: AppColors.inkMute),
                      ),
                    Text(
                      '₦${order.amount.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontFamily: 'GeistMono',
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              OrderStatusBadge(status: order.status),
            ],
          ),
        ),
      ),
    );
  }
}
