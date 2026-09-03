import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/payout_repository.dart';

final payoutRepositoryProvider = Provider<PayoutRepository>((ref) => PayoutRepository());

final payoutStatusProvider = FutureProvider<PayoutStatus>((ref) {
  return ref.watch(payoutRepositoryProvider).getStatus();
});

final banksProvider = FutureProvider<List<Bank>>((ref) {
  return ref.watch(payoutRepositoryProvider).fetchBanks();
});
