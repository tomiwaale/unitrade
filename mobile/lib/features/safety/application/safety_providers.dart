import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models.dart';
import '../data/safety_repository.dart';

final safetyRepositoryProvider = Provider<SafetyRepository>((ref) => SafetyRepository());

final blockedAccountsProvider = FutureProvider<List<BlockedAccount>>((ref) {
  return ref.watch(safetyRepositoryProvider).fetchBlockedAccounts();
});

/// Ids this user has blocked, for filtering catalog results.
final blockedUserIdsProvider = FutureProvider<List<String>>((ref) {
  return ref.watch(safetyRepositoryProvider).fetchBlockedUserIds();
});
