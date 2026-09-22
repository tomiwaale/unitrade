import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/safety_providers.dart';
import '../data/models.dart';

class BlockedAccountsScreen extends ConsumerWidget {
  const BlockedAccountsScreen({super.key});

  Future<void> _unblock(BuildContext context, WidgetRef ref, BlockedAccount account) async {
    try {
      await ref.read(safetyRepositoryProvider).unblockUser(account.blockedId);
      ref.invalidate(blockedAccountsProvider);
      ref.invalidate(blockedUserIdsProvider);
    } on SafetyException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
      return;
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${account.name} is unblocked.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blockedAsync = ref.watch(blockedAccountsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Blocked accounts')),
      body: blockedAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => const Center(
          child: Text("Couldn't load your blocked accounts",
              style: TextStyle(color: AppColors.inkMute)),
        ),
        data: (accounts) {
          if (accounts.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.block, size: 32, color: AppColors.inkMute),
                    SizedBox(height: 14),
                    Text("You haven't blocked anyone",
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.ink)),
                    SizedBox(height: 6),
                    Text('You can block someone from the menu at the top of any conversation.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13.5, color: AppColors.inkMute, height: 1.5)),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(blockedAccountsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: accounts.length + 1,
              separatorBuilder: (context, index) => const Divider(height: 1, color: AppColors.lineSoft),
              itemBuilder: (context, index) {
                if (index == accounts.length) {
                  return const Padding(
                    padding: EdgeInsets.fromLTRB(20, 20, 20, 32),
                    child: Text(
                      "Blocking someone isn't the same as reporting them. If a student broke our "
                      'community rules, report them so a moderator reviews it — we respond to every '
                      'report within 24 hours.',
                      style: TextStyle(fontSize: 12.5, color: AppColors.inkMute, height: 1.5),
                    ),
                  );
                }

                final account = accounts[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.backgroundSunken,
                    child: Text(
                      _initials(account.name),
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.inkSoft),
                    ),
                  ),
                  title: Text(account.name,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  subtitle: Text('Blocked ${_formatDate(account.createdAt)}',
                      style: const TextStyle(fontSize: 12.5, color: AppColors.inkMute)),
                  trailing: OutlinedButton(
                    onPressed: () => _unblock(context, ref, account),
                    child: const Text('Unblock'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }

  static String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
