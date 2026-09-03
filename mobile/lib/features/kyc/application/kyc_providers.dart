import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/kyc_repository.dart';

final kycRepositoryProvider = Provider<KycRepository>((ref) => KycRepository());

final myKycStatusProvider = FutureProvider<KycStatus>((ref) {
  return ref.watch(kycRepositoryProvider).getStatus();
});
