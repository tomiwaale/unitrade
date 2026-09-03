import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/data/product.dart';
import '../data/swap_models.dart';
import '../data/swap_repository.dart';

final swapRepositoryProvider = Provider<SwapRepository>((ref) => SwapRepository());

final receivedSwapsProvider = FutureProvider<List<SwapOffer>>((ref) {
  return ref.watch(swapRepositoryProvider).fetchReceived();
});

final sentSwapsProvider = FutureProvider<List<SwapOffer>>((ref) {
  return ref.watch(swapRepositoryProvider).fetchSent();
});

final myActiveListingsForSwapProvider = FutureProvider.family<List<Product>, String>((ref, excludeProductId) {
  return ref.watch(swapRepositoryProvider).fetchMyActiveListings(excludeProductId);
});

final pendingSwapsCountProvider = Provider<int>((ref) {
  final swapsAsync = ref.watch(receivedSwapsProvider);
  return swapsAsync.maybeWhen(
    data: (swaps) => swaps.where((s) => s.isPending).length,
    orElse: () => 0,
  );
});
