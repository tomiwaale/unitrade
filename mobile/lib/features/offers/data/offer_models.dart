// Mirrors the `price_offers` table and the presentation helpers in
// lib/offers.ts. The rules live in the database (033_price_offers.sql) because
// an offer sets the amount money moves at, so everything here is either a
// field or a question about a field — never a decision.

/// What happened to an offer, as recorded on the chat message that announced
/// it. A single offer produces several of these (offered → accepted), which is
/// why the bubble needs the event and not just the offer.
enum OfferEvent { offered, countered, accepted, declined, withdrawn }

/// Null for an ordinary message, and also for an `offer_event` value a newer
/// server knows about and this build does not — in which case the bubble falls
/// back to the message's own text, which the database wrote to be readable on
/// its own for exactly this reason.
OfferEvent? offerEventFromName(String? value) => switch (value) {
      'offered' => OfferEvent.offered,
      'countered' => OfferEvent.countered,
      'accepted' => OfferEvent.accepted,
      'declined' => OfferEvent.declined,
      'withdrawn' => OfferEvent.withdrawn,
      _ => null,
    };

class PriceOffer {
  PriceOffer({
    required this.id,
    required this.productId,
    required this.buyerId,
    required this.sellerId,
    required this.offeredBy,
    required this.amount,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
    this.conversationId,
    this.note,
    this.countersId,
    this.respondedAt,
    this.orderId,
  });

  final String id;
  final String productId;

  /// Nullable so deleting a thread never destroys the record of a price two
  /// people agreed on.
  final String? conversationId;
  final String buyerId;
  final String sellerId;

  /// Which side put this number on the table. A counter-offer is a row with
  /// `offeredBy == sellerId`, which is what makes "who may accept this?"
  /// answerable from the row alone.
  final String offeredBy;
  final double amount;
  final String? note;

  /// 'pending' | 'accepted' | 'declined' | 'countered' | 'withdrawn' |
  /// 'expired'. Kept as the raw string rather than an enum so a status added
  /// server-side degrades to "no actions available" instead of crashing the
  /// thread on parse.
  final String status;
  final String? countersId;
  final DateTime expiresAt;
  final DateTime? respondedAt;

  /// Set once an accepted offer has been spent on a checkout.
  final String? orderId;
  final DateTime createdAt;

  bool get isPending => status == 'pending';
  bool get isAccepted => status == 'accepted';

  /// Still standing: not answered away, and not out of time.
  bool get isLive =>
      (isPending || isAccepted) && expiresAt.isAfter(DateTime.now());

  /// An agreed price that has not been paid yet and has not lapsed. This is
  /// what the pay button offers to charge — checkout re-resolves it
  /// server-side, so this is presentation only.
  bool get isRedeemable => isAccepted && orderId == null && isLive;

  /// Whether [userId] is the one being asked. Accepting and declining belong to
  /// the side that did *not* name the price.
  bool canRespondBy(String userId) =>
      isPending &&
      isLive &&
      offeredBy != userId &&
      (buyerId == userId || sellerId == userId);

  /// ...and withdrawing belongs to the side that did.
  bool canWithdrawBy(String userId) =>
      isPending && isLive && offeredBy == userId;

  /// Rounded up, so "expires in 0 hours" never appears on a live offer.
  String get expiryLabel {
    final remaining = expiresAt.difference(DateTime.now());
    if (remaining <= Duration.zero) return 'Expired';

    final hours = (remaining.inMinutes / 60).ceil();
    if (hours <= 1) return 'Expires within the hour';
    if (hours < 24) return 'Expires in $hours hours';

    final days = (hours / 24).ceil();
    return 'Expires in $days day${days == 1 ? '' : 's'}';
  }

  String get statusLabel => switch (status) {
        'pending' => 'Awaiting reply',
        'accepted' => 'Accepted',
        'declined' => 'Declined',
        'countered' => 'Countered',
        'withdrawn' => 'Withdrawn',
        'expired' => 'Expired',
        _ => 'Updated',
      };

  factory PriceOffer.fromJson(Map<String, dynamic> json) => PriceOffer(
        id: json['id'] as String,
        productId: json['product_id'] as String,
        conversationId: json['conversation_id'] as String?,
        buyerId: json['buyer_id'] as String,
        sellerId: json['seller_id'] as String,
        offeredBy: json['offered_by'] as String,
        amount: (json['amount'] as num).toDouble(),
        note: json['note'] as String?,
        status: json['status'] as String,
        countersId: json['counters_id'] as String?,
        expiresAt: DateTime.parse(json['expires_at'] as String),
        respondedAt: json['responded_at'] != null
            ? DateTime.parse(json['responded_at'] as String)
            : null,
        orderId: json['order_id'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}

extension PriceOfferList on List<PriceOffer> {
  /// The agreed price this buyer can still pay, if there is one. The unique
  /// index in 033_price_offers.sql allows only one of these per (listing,
  /// buyer), so "first match" is not a tie-break.
  PriceOffer? get redeemable =>
      where((offer) => offer.isRedeemable).firstOrNull;

  /// A price this buyer has named that nobody has answered yet. Likewise
  /// at most one, by the partial unique index on pending offers.
  PriceOffer? get awaitingReply =>
      where((offer) => offer.isPending && offer.isLive).firstOrNull;
}
