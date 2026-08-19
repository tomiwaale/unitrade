import '../../../core/supabase/supabase_client.dart';
import 'models.dart';

const _conversationSelect = 'id, product_id, buyer_id, seller_id, created_at, '
    'product:products(title, images), '
    'buyer:profiles!conversations_buyer_id_fkey(full_name), '
    'seller:profiles!conversations_seller_id_fkey(full_name)';

/// Mirrors app/actions/chat.ts — direct table access, RLS already scopes
/// conversations/messages to their two participants (006_chat.sql).
/// Notification-on-new-message is handled by the on_message_created DB
/// trigger (016_mobile_support.sql), so sending here doesn't need to call
/// anything extra to notify the recipient.
class ChatRepository {
  String get _myId => supabase.auth.currentUser!.id;

  Future<String> openConversation({
    required String productId,
    required String sellerId,
    String? initialMessage,
  }) async {
    final row = await supabase
        .from('conversations')
        .upsert(
          {'product_id': productId, 'buyer_id': _myId, 'seller_id': sellerId},
          onConflict: 'product_id,buyer_id',
          ignoreDuplicates: false,
        )
        .select('id')
        .single();

    final conversationId = row['id'] as String;

    if (initialMessage != null && initialMessage.trim().isNotEmpty) {
      await supabase.from('messages').insert({
        'conversation_id': conversationId,
        'sender_id': _myId,
        'content': initialMessage.trim(),
      });
    }

    return conversationId;
  }

  Future<List<ConversationSummary>> fetchConversations() async {
    final rows = await supabase
        .from('conversations')
        .select(_conversationSelect)
        .or('buyer_id.eq.$_myId,seller_id.eq.$_myId')
        .order('created_at', ascending: false);

    final conversations = rows as List;
    if (conversations.isEmpty) return [];

    final ids = conversations.map((c) => c['id'] as String).toList();

    // Latest message per conversation, capped defensively — fine at
    // marketplace chat scale, revisit if conversation volume grows.
    final messageRows = await supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .inFilter('conversation_id', ids)
        .order('created_at', ascending: false)
        .limit(300);

    final latestByConversation = <String, Map<String, dynamic>>{};
    for (final row in messageRows as List) {
      final id = row['conversation_id'] as String;
      latestByConversation.putIfAbsent(id, () => row as Map<String, dynamic>);
    }

    return conversations
        .map((row) => _toSummary(
              row as Map<String, dynamic>,
              latest: latestByConversation[row['id']],
            ))
        .toList()
      ..sort((a, b) => b.sortKey.compareTo(a.sortKey));
  }

  /// Single conversation by id — needed when the screen is opened from a
  /// push-notification tap, which routes to /messages/:id without the
  /// summary the chat list passes as `extra`.
  Future<ConversationSummary?> fetchConversation(String conversationId) async {
    final row = await supabase
        .from('conversations')
        .select(_conversationSelect)
        .eq('id', conversationId)
        .maybeSingle();

    return row == null ? null : _toSummary(row);
  }

  ConversationSummary _toSummary(Map<String, dynamic> row, {Map<String, dynamic>? latest}) {
    final isBuyer = row['buyer_id'] == _myId;
    final other = isBuyer ? row['seller'] : row['buyer'];
    final product = row['product'] as Map<String, dynamic>?;
    final images = (product?['images'] as List?)?.cast<String>();

    return ConversationSummary(
      id: row['id'] as String,
      productId: row['product_id'] as String?,
      productTitle: product?['title'] as String?,
      productImage: images != null && images.isNotEmpty ? images.first : null,
      otherUserId: (isBuyer ? row['seller_id'] : row['buyer_id']) as String,
      otherUserName: (other?['full_name'] as String?) ?? 'Student',
      createdAt: DateTime.parse(row['created_at'] as String),
      lastMessage: latest?['content'] as String?,
      lastMessageAt: latest != null ? DateTime.parse(latest['created_at'] as String) : null,
    );
  }

  Stream<List<ChatMessage>> watchMessages(String conversationId) {
    return supabase
        .from('messages')
        .stream(primaryKey: ['id'])
        .eq('conversation_id', conversationId)
        .order('created_at')
        .map((rows) => rows.map(ChatMessage.fromJson).toList());
  }

  Future<void> sendMessage(String conversationId, String content) async {
    final trimmed = content.trim();
    if (trimmed.isEmpty || trimmed.length > 2000) return;

    await supabase.from('messages').insert({
      'conversation_id': conversationId,
      'sender_id': _myId,
      'content': trimmed,
    });
  }
}
