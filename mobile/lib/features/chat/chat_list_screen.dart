import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme/app_colors.dart';
import '../../core/widgets/skeletons.dart';
import 'application/chat_providers.dart';
import 'data/models.dart';

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(conversationsProvider),
        child: conversationsAsync.when(
          loading: () => const ChatListSkeleton(),
          error: (error, stack) => ListView(
            children: const [
              SizedBox(height: 80),
              Center(child: Text("Couldn't load messages", style: TextStyle(color: AppColors.inkMute))),
            ],
          ),
          data: (conversations) => conversations.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 80),
                    Center(child: Text('No conversations yet', style: TextStyle(color: AppColors.inkMute))),
                  ],
                )
              : ListView.separated(
                  itemCount: conversations.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final ConversationSummary c = conversations[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primaryTint,
                        backgroundImage: c.productImage != null
                            ? CachedNetworkImageProvider(c.productImage!)
                            : null,
                        child: c.productImage == null
                            ? Text(c.otherUserName.isNotEmpty ? c.otherUserName[0].toUpperCase() : '?')
                            : null,
                      ),
                      title: Text(c.otherUserName, style: Theme.of(context).textTheme.titleMedium),
                      subtitle: Text(
                        c.lastMessage ?? (c.productTitle != null ? 'About "${c.productTitle}"' : ''),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Text(
                        timeago.format(c.sortKey, allowFromNow: true, locale: 'en_short'),
                        style: const TextStyle(fontSize: 11, color: AppColors.inkMute),
                      ),
                      onTap: () => context.push('/messages/${c.id}', extra: c),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
