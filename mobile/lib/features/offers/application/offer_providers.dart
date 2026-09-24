import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/offer_models.dart';
import '../data/offer_repository.dart';

final offerRepositoryProvider = Provider<OfferRepository>((ref) => OfferRepository());

/// Offers in a thread. Refreshed whenever an offer message lands on the
/// messages stream — every offer event posts one, so that stream is a reliable
/// trigger and no second realtime subscription is needed.
final conversationOffersProvider =
    FutureProvider.family<List<PriceOffer>, String>((ref, conversationId) {
  return ref.watch(offerRepositoryProvider).fetchForConversation(conversationId);
});

/// This buyer's offers on a listing. The product screen needs both the agreed
/// price (to offer to pay it) and any offer still awaiting a reply (so it does
/// not invite a second one), which the PriceOfferList getters pull out.
final productOffersProvider =
    FutureProvider.family<List<PriceOffer>, String>((ref, productId) {
  return ref.watch(offerRepositoryProvider).fetchForProduct(productId);
});
