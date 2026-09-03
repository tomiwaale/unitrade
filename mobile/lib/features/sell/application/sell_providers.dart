import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/data/product.dart';
import '../data/sell_repository.dart';

export '../../kyc/application/kyc_providers.dart' show kycRepositoryProvider, myKycStatusProvider;

final sellRepositoryProvider = Provider<SellRepository>((ref) => SellRepository());

final myListingsProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(sellRepositoryProvider).fetchMyListings();
});
