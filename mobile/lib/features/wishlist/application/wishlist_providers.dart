import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/data/product.dart';
import '../data/wishlist_repository.dart';

final wishlistRepositoryProvider = Provider<WishlistRepository>((ref) => WishlistRepository());

final wishlistedProductsProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(wishlistRepositoryProvider).fetchWishlistedProducts();
});

final isWishlistedProvider = FutureProvider.family<bool, String>((ref, productId) {
  return ref.watch(wishlistRepositoryProvider).isWishlisted(productId);
});
