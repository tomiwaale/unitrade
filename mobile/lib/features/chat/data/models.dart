class ChatMessage {
  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.createdAt,
    this.content,
    this.imageUrl,
    this.readAt,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final DateTime createdAt;

  /// Null for an image-only message — 027_chat_images.sql dropped the NOT
  /// NULL but keeps at least one of content/image_url present.
  final String? content;
  final String? imageUrl;
  final DateTime? readAt;

  bool get hasText => (content?.trim().isNotEmpty ?? false);
  bool get isRead => readAt != null;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String,
        senderId: json['sender_id'] as String,
        content: json['content'] as String?,
        imageUrl: json['image_url'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        readAt: json['read_at'] != null ? DateTime.parse(json['read_at'] as String) : null,
      );
}

class ConversationSummary {
  ConversationSummary({
    required this.id,
    required this.productId,
    required this.productTitle,
    required this.productImage,
    required this.otherUserId,
    required this.otherUserName,
    required this.createdAt,
    this.productPrice,
    this.productStatus,
    this.isBuyer = false,
    this.lastMessage,
    this.lastMessageAt,
  });

  final String id;
  final String? productId;
  final String? productTitle;
  final String? productImage;
  final double? productPrice;
  final String? productStatus;
  final String otherUserId;
  final String otherUserName;

  /// Whether *I* am the buyer in this conversation — the product context bar
  /// only offers "Buy" to the side that can actually buy.
  final bool isBuyer;
  final DateTime createdAt;
  final String? lastMessage;
  final DateTime? lastMessageAt;

  bool get canBuy => isBuyer && productId != null && productStatus == 'active';

  DateTime get sortKey => lastMessageAt ?? createdAt;
}
