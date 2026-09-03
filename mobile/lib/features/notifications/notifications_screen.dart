import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme/app_colors.dart';
import '../../core/widgets/skeletons.dart';
import 'application/notifications_providers.dart';
import 'data/models.dart';

const _typeIcons = <String, IconData>{
  'order': Icons.shopping_bag_outlined,
  'review': Icons.star_border,
  'swap': Icons.swap_horiz,
  'message': Icons.chat_bubble_outline,
};

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _open(BuildContext context, WidgetRef ref, AppNotification notification) async {
    if (!notification.read) {
      await ref.read(notificationRepositoryProvider).markRead(notification.id);
      ref.invalidate(notificationsProvider);
    }
    final route = notification.route;
    if (route != null && context.mounted) context.push(route);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          notificationsAsync.maybeWhen(
            data: (items) => items.any((n) => !n.read)
                ? TextButton(
                    onPressed: () async {
                      await ref.read(notificationRepositoryProvider).markAllRead();
                      ref.invalidate(notificationsProvider);
                    },
                    child: const Text('Mark all read'),
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(notificationsProvider),
        child: notificationsAsync.when(
          loading: () => const NotificationListSkeleton(),
          error: (error, stack) => ListView(
            children: const [
              SizedBox(height: 80),
              Center(child: Text("Couldn't load notifications", style: TextStyle(color: AppColors.inkMute))),
            ],
          ),
          data: (items) => items.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 80),
                    Center(child: Text('No notifications yet', style: TextStyle(color: AppColors.inkMute))),
                  ],
                )
              : ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final n = items[index];
                    return ListTile(
                      tileColor: n.read ? null : AppColors.primaryTint,
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primaryTint,
                        foregroundColor: AppColors.primaryInk,
                        child: Icon(_typeIcons[n.type] ?? Icons.notifications_none, size: 18),
                      ),
                      title: Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.w500 : FontWeight.w700)),
                      subtitle: Text(n.body ?? timeago.format(n.createdAt)),
                      trailing: n.read ? null : const Icon(Icons.circle, size: 8, color: AppColors.primary),
                      onTap: () => _open(context, ref, n),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
