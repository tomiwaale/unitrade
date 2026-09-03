/// Mirrors the `orders` table (supabase/schema.sql,
/// 015_launch_hardening.sql). status lifecycle: pending → paid → confirmed
/// (or disputed); auto-released after 7 days if the buyer doesn't confirm.
class OrderSummary {
  OrderSummary({
    required this.id,
    required this.amount,
    required this.status,
    required this.createdAt,
    required this.isBuyer,
    this.productTitle,
    this.productImage,
    this.counterpartyName,
  });

  final String id;
  final double amount;
  final String status;
  final DateTime createdAt;
  final bool isBuyer;
  final String? productTitle;
  final String? productImage;
  final String? counterpartyName;

  factory OrderSummary.fromBuyerRow(Map<String, dynamic> row) {
    final product = row['products'] as Map<String, dynamic>?;
    final images = (product?['images'] as List?)?.cast<String>();
    return OrderSummary(
      id: row['id'] as String,
      amount: (row['amount'] as num).toDouble(),
      status: row['status'] as String,
      createdAt: DateTime.parse(row['created_at'] as String),
      isBuyer: true,
      productTitle: product?['title'] as String?,
      productImage: images != null && images.isNotEmpty ? images.first : null,
    );
  }

  factory OrderSummary.fromSellerRow(Map<String, dynamic> row) {
    final product = row['products'] as Map<String, dynamic>?;
    final images = (product?['images'] as List?)?.cast<String>();
    final buyer = row['profiles'] as Map<String, dynamic>?;
    return OrderSummary(
      id: row['id'] as String,
      amount: (row['amount'] as num).toDouble(),
      status: row['status'] as String,
      createdAt: DateTime.parse(row['created_at'] as String),
      isBuyer: false,
      productTitle: product?['title'] as String?,
      productImage: images != null && images.isNotEmpty ? images.first : null,
      counterpartyName: buyer?['full_name'] as String?,
    );
  }
}

class OrderDetail {
  OrderDetail({
    required this.id,
    required this.amount,
    required this.status,
    required this.createdAt,
    required this.buyerId,
    required this.sellerId,
    this.autoReleaseAt,
    this.confirmedAt,
    this.disputedAt,
    this.productTitle,
    this.productImage,
    this.sellerName,
    this.sellerUniversity,
    this.hasReview = false,
  });

  final String id;
  final double amount;
  final String status;
  final DateTime createdAt;
  final String buyerId;
  final String sellerId;
  final DateTime? autoReleaseAt;
  final DateTime? confirmedAt;
  final DateTime? disputedAt;
  final String? productTitle;
  final String? productImage;
  final String? sellerName;
  final String? sellerUniversity;
  final bool hasReview;

  double get sellerPayout => amount * 0.9;

  factory OrderDetail.fromJson(Map<String, dynamic> row) {
    final product = row['products'] as Map<String, dynamic>?;
    final images = (product?['images'] as List?)?.cast<String>();
    final seller = product?['profiles'] as Map<String, dynamic>?;
    final reviews = row['reviews'];

    return OrderDetail(
      id: row['id'] as String,
      amount: (row['amount'] as num).toDouble(),
      status: row['status'] as String,
      createdAt: DateTime.parse(row['created_at'] as String),
      buyerId: row['buyer_id'] as String,
      sellerId: product?['seller_id'] as String? ?? '',
      autoReleaseAt: row['auto_release_at'] != null ? DateTime.parse(row['auto_release_at'] as String) : null,
      confirmedAt: row['confirmed_at'] != null ? DateTime.parse(row['confirmed_at'] as String) : null,
      disputedAt: row['disputed_at'] != null ? DateTime.parse(row['disputed_at'] as String) : null,
      productTitle: product?['title'] as String?,
      productImage: images != null && images.isNotEmpty ? images.first : null,
      sellerName: seller?['full_name'] as String?,
      sellerUniversity: seller?['university'] as String?,
      hasReview: reviews is List ? reviews.isNotEmpty : reviews != null,
    );
  }
}
