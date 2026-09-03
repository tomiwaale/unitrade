import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/profile_repository.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) => ProfileRepository());

final profileProvider = FutureProvider.family<UserProfile, String>((ref, userId) {
  return ref.watch(profileRepositoryProvider).fetchProfile(userId);
});

final profileStatsProvider = FutureProvider.family<ProfileStats, String>((ref, userId) {
  return ref.watch(profileRepositoryProvider).fetchProfileStats(userId);
});
