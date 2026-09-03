import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/application/catalog_providers.dart';
import '../../catalog/data/product.dart';

final productDetailProvider = FutureProvider.family<Product, String>((ref, productId) {
  return ref.watch(productRepositoryProvider).fetchProduct(productId);
});
