import '../../offers/data/offer_models.dart';

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.createdAt,
    this.content,
    this.imageUrl,
    this.readAt,
    this.hiddenAt,
    this.offerId,
    this.offerEvent,
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

  /// Set when a moderator takes the message down (031_user_safety.sql). The
  /// content is already replaced with a tombstone server-side; this is what
  /// lets the bubble style itself as removed and drop its report affordance.
  final DateTime? hiddenAt;

  /// Set on a price-negotiation event (033_price_offers.sql). The bubble renders
  /// as an offer card, reading the amount and the live status from the
  /// price_offers row rather than from here — one offer spans several messages
  /// and its status changes after the fact. `content` still carries a readable
  /// line ("Offered ₦18,000"), which is what a build older than the migration
  /// shows and what this falls back to while the offer row loads.
  final String? offerId;
  final OfferEvent? offerEvent;

  bool get hasText => (content?.trim().isNotEmpty ?? false);
  bool get isRead => readAt != null;
  bool get isRemoved => hiddenAt != null;
  bool get isOffer => offerId != null && offerEvent != null;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String,
        senderId: json['sender_id'] as String,
        content: json['content'] as String?,
        imageUrl: json['image_url'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        readAt: json['read_at'] != null ? DateTime.parse(json['read_at'] as String) : null,
        hiddenAt: json['hidden_at'] != null ? DateTime.parse(json['hidden_at'] as String) : null,
        offerId: json['offer_id'] as String?,
        offerEvent: offerEventFromName(json['offer_event'] as String?),
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
    this.allowOffers = false,
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

  /// Whether this listing takes price offers (033_price_offers.sql). A service
  /// has no fixed unit to haggle over, and a swap-only listing no cash price,
  /// so both arrive here as false.
  final bool allowOffers;
  final String otherUserId;
  final String otherUserName;

  /// Whether *I* am the buyer in this conversation — the product context bar
  /// only offers "Buy" to the side that can actually buy.
  final bool isBuyer;
  final DateTime createdAt;
  final String? lastMessage;
  final DateTime? lastMessageAt;

  bool get canBuy => isBuyer && productId != null && productStatus == 'active';

  /// Only the buyer opens a negotiation; the seller answers one from the offer
  /// card itself.
  bool get canOffer => isBuyer && allowOffers && productId != null && productStatus == 'active';

  DateTime get sortKey => lastMessageAt ?? createdAt;
}
