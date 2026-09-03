import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/review_models.dart';
import '../data/review_repository.dart';

final reviewRepositoryProvider = Provider<ReviewRepository>((ref) => ReviewRepository());

final sellerRatingProvider = FutureProvider.family<SellerRatingSummary, String>((ref, sellerId) {
  return ref.watch(reviewRepositoryProvider).fetchSellerRating(sellerId);
});
