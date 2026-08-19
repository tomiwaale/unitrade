import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/calling_repository.dart';
import '../data/chat_repository.dart';
import '../data/models.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) => ChatRepository());
final callingRepositoryProvider = Provider<CallingRepository>((ref) => CallingRepository());

final conversationsProvider = FutureProvider<List<ConversationSummary>>((ref) {
  return ref.watch(chatRepositoryProvider).fetchConversations();
});

/// Fallback for entering a conversation without the summary the chat list
/// hands over as `extra` (i.e. a push-notification tap).
final conversationSummaryProvider =
    FutureProvider.family<ConversationSummary?, String>((ref, conversationId) {
  return ref.watch(chatRepositoryProvider).fetchConversation(conversationId);
});

final conversationMessagesProvider =
    StreamProvider.family<List<ChatMessage>, String>((ref, conversationId) {
  return ref.watch(chatRepositoryProvider).watchMessages(conversationId);
});
