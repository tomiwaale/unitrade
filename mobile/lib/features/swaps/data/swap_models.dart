// Mirrors the `swap_offers` table (010_swap_offers.sql,
// 015_launch_hardening.sql) joined with the two referenced products and
// their owners, matching the `fields` select in app/swaps/page.tsx.

/// A product referenced by a swap offer. Nullable throughout — the product
/// may have been deleted since the offer was made, in which case Supabase
/// returns a null join (mirrors `product?.title ?? "Deleted listing"` on web).
class SwapProductRef {
  SwapProductRef({this.id, this.title, this.price, this.image});

  final String? id;
  final String? title;
  final double? price;
  final String? image;

  static SwapProductRef? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    final images = (json['images'] as List?)?.cast<String>();
    return SwapProductRef(
      id: json['id'] as String?,
      title: json['title'] as String?,
      price: (json['price'] as num?)?.toDouble(),
      image: images != null && images.isNotEmpty ? images.first : null,
    );
  }
}

class SwapOffer {
  SwapOffer({
    required this.id,
    required this.status,
    required this.cashTopup,
    required this.createdAt,
    required this.buyerId,
    required this.sellerId,
    required this.wantedProduct,
    required this.offeredProduct,
    this.note,
    this.counterpartyName,
  });

  final String id;
  final String status;
  final double cashTopup;
  final DateTime createdAt;
  final String buyerId;
  final String sellerId;
  final SwapProductRef? wantedProduct;
  final SwapProductRef? offeredProduct;
  final String? note;
  final String? counterpartyName;

  bool get isPending => status == 'pending';

  factory SwapOffer.fromReceivedRow(Map<String, dynamic> json) =>
      SwapOffer._fromJson(json, counterparty: json['buyer'] as Map<String, dynamic>?);

  factory SwapOffer.fromSentRow(Map<String, dynamic> json) =>
      SwapOffer._fromJson(json, counterparty: json['seller'] as Map<String, dynamic>?);

  factory SwapOffer._fromJson(Map<String, dynamic> json, {Map<String, dynamic>? counterparty}) {
    return SwapOffer(
      id: json['id'] as String,
      status: json['status'] as String,
      cashTopup: (json['cash_topup'] as num?)?.toDouble() ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      buyerId: json['buyer_id'] as String,
      sellerId: json['seller_id'] as String,
      wantedProduct: SwapProductRef.fromJson(json['wanted_product'] as Map<String, dynamic>?),
      offeredProduct: SwapProductRef.fromJson(json['offered_product'] as Map<String, dynamic>?),
      note: json['note'] as String?,
      counterpartyName: counterparty?['full_name'] as String?,
    );
  }
}
