import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/safety_providers.dart';
import '../data/models.dart';
import 'report_sheet.dart';

/// The "…" menu that has to be reachable from anywhere a student can see
/// another student's content. Report and Block are the two things App Store
/// Review Guideline 1.2 requires be available, so this is deliberately one
/// widget used in every such place rather than a per-screen re-implementation.
class SafetyMenuButton extends ConsumerWidget {
  const SafetyMenuButton({
    super.key,
    required this.otherUserId,
    required this.otherUserName,
    this.onBlocked,
  });

  final String otherUserId;
  final String otherUserName;

  /// Blocking hides the conversation, so the screen that was showing it has
  /// to go somewhere else.
  final VoidCallback? onBlocked;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final firstName = otherUserName.split(' ').first;

    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert),
      tooltip: 'Safety options',
      onSelected: (value) async {
        if (value == 'report') {
          await showReportSheet(
            context,
            targetType: ReportTargetType.user,
            targetId: otherUserId,
            subject: otherUserName,
            blockUserId: otherUserId,
            blockUserName: otherUserName,
          );
        } else if (value == 'block') {
          final blocked = await confirmAndBlock(
            context,
            ref,
            userId: otherUserId,
            userName: otherUserName,
          );
          if (blocked) onBlocked?.call();
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'report',
          child: Row(children: [
            const Icon(Icons.flag_outlined, size: 18, color: AppColors.inkSoft),
            const SizedBox(width: 10),
            Text('Report $firstName'),
          ]),
        ),
        PopupMenuItem(
          value: 'block',
          child: Row(children: [
            const Icon(Icons.block, size: 18, color: AppColors.destructive),
            const SizedBox(width: 10),
            Text('Block $firstName', style: const TextStyle(color: AppColors.destructive)),
          ]),
        ),
      ],
    );
  }
}

/// Confirms, then blocks. Returns true if the block went through.
Future<bool> confirmAndBlock(
  BuildContext context,
  WidgetRef ref, {
  required String userId,
  required String userName,
}) async {
  final choice = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      icon: const Icon(Icons.block, color: AppColors.destructive, size: 26),
      title: Text('Block $userName?'),
      content: const Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("• They can't message you again.\n"
              '• Your conversation leaves your inbox.\n'
              "• They aren't told that you blocked them.\n"
              '• You can undo this any time in Settings.',
              style: TextStyle(fontSize: 13.5, height: 1.6)),
          SizedBox(height: 12),
          Text('If they broke our rules, report them instead — that way a moderator sees it.',
              style: TextStyle(fontSize: 12.5, color: AppColors.inkMute, height: 1.4)),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop('cancel'),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop('report'),
          child: const Text('Report instead'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop('block'),
          style: FilledButton.styleFrom(backgroundColor: AppColors.destructive),
          child: const Text('Block'),
        ),
      ],
    ),
  );

  if (!context.mounted) return false;

  if (choice == 'report') {
    await showReportSheet(
      context,
      targetType: ReportTargetType.user,
      targetId: userId,
      subject: userName,
      blockUserId: userId,
      blockUserName: userName,
    );
    return false;
  }

  if (choice != 'block') return false;

  try {
    await ref.read(safetyRepositoryProvider).blockUser(userId);
    ref.invalidate(blockedAccountsProvider);
    ref.invalidate(blockedUserIdsProvider);
  } on SafetyException catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
    return false;
  }

  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$userName is blocked.')),
    );
  }

  return true;
}
