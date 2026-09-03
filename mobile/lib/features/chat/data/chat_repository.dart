import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client.dart';
import 'models.dart';

const _conversationSelect = 'id, product_id, buyer_id, seller_id, created_at, '
    'product:products(title, images, price, status), '
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
        // TODO(migration): restore `image_url` here once 027_chat_images.sql
        // is applied — until the column exists PostgREST 42703s the whole
        // request and the conversation list cannot load at all.
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
      productPrice: (product?['price'] as num?)?.toDouble(),
      productStatus: product?['status'] as String?,
      otherUserId: (isBuyer ? row['seller_id'] : row['buyer_id']) as String,
      otherUserName: (other?['full_name'] as String?) ?? 'Student',
      isBuyer: isBuyer,
      createdAt: DateTime.parse(row['created_at'] as String),
      lastMessage: _previewOf(latest),
      lastMessageAt: latest != null ? DateTime.parse(latest['created_at'] as String) : null,
    );
  }

  /// An image-only message has no text to preview in the chat list. Reads
  /// image_url defensively so this keeps working either side of
  /// 027_chat_images.sql.
  static String? _previewOf(Map<String, dynamic>? latest) {
    if (latest == null) return null;
    final content = (latest['content'] as String?)?.trim();
    if (content != null && content.isNotEmpty) return content;
    return latest['image_url'] != null ? '📷 Photo' : null;
  }

  /// `.stream()` always returns whole rows, so image_url and read_at arrive
  /// without listing them anywhere.
  Stream<List<ChatMessage>> watchMessages(String conversationId) {
    return supabase
        .from('messages')
        .stream(primaryKey: ['id'])
        .eq('conversation_id', conversationId)
        // postgrest-dart's `order()` defaults ascending to false — without
        // this the stream comes back newest-first, which then renders
        // newest-at-top since the ListView has no `reverse: true`.
        .order('created_at', ascending: true)
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

  /// Uploads to the public chat-images bucket (027_chat_images.sql) the same
  /// way listings do, then sends the message. `caption` may be null — the
  /// messages_content_or_image_check constraint accepts an image on its own.
  Future<void> sendImage(
    String conversationId,
    Uint8List bytes, {
    String extension = 'jpg',
    String? caption,
  }) async {
    final path = '$_myId/${DateTime.now().microsecondsSinceEpoch}.$extension';
    await supabase.storage.from('chat-images').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg'),
        );

    final trimmed = caption?.trim();
    await supabase.from('messages').insert({
      'conversation_id': conversationId,
      'sender_id': _myId,
      'content': trimmed != null && trimmed.isNotEmpty ? trimmed : null,
      'image_url': supabase.storage.from('chat-images').getPublicUrl(path),
    });
  }

  /// Stamps read_at on everything the counterpart sent. The UPDATE grant is
  /// narrowed to read_at only (029_message_read_receipts.sql), so this can't
  /// touch anything else even by accident.
  Future<void> markConversationRead(String conversationId) async {
    await supabase
        .from('messages')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('conversation_id', conversationId)
        .neq('sender_id', _myId)
        .isFilter('read_at', null);
  }
}
