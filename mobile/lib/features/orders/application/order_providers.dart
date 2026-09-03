import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/order_models.dart';
import '../data/order_repository.dart';

final orderRepositoryProvider = Provider<OrderRepository>((ref) => OrderRepository());

final purchasesProvider = FutureProvider<List<OrderSummary>>((ref) {
  return ref.watch(orderRepositoryProvider).fetchPurchases();
});

final salesProvider = FutureProvider<List<OrderSummary>>((ref) {
  return ref.watch(orderRepositoryProvider).fetchSales();
});

final orderDetailProvider = FutureProvider.family<OrderDetail, String>((ref, orderId) {
  return ref.watch(orderRepositoryProvider).fetchOrder(orderId);
});
