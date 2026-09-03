/// Mirrors the `products` table (supabase/schema.sql,
/// 004_product_category_location.sql, 016_mobile_support.sql).
class Product {
  Product({
    required this.id,
    required this.sellerId,
    required this.title,
    required this.description,
    required this.price,
    required this.images,
    required this.status,
    this.category,
    this.condition,
    this.openTo,
    this.location,
    this.listingType,
    this.latitude,
    this.longitude,
    this.sellerName,
    this.sellerUniversity,
    required this.createdAt,
  });

  final String id;
  final String sellerId;
  final String title;
  final String description;
  final double price;
  final List<String> images;
  final String status;
  final String? category;
  final String? condition;
  final String? openTo;
  final String? location;
  final String? listingType;
  final double? latitude;
  final double? longitude;
  final String? sellerName;
  final String? sellerUniversity;
  final DateTime createdAt;

  String? get coverImage => images.isNotEmpty ? images.first : null;

  factory Product.fromJson(Map<String, dynamic> json) {
    final seller = json['seller'] as Map<String, dynamic>?;
    return Product(
      id: json['id'] as String,
      sellerId: json['seller_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      price: (json['price'] as num).toDouble(),
      images: (json['images'] as List?)?.map((e) => e as String).toList() ?? const [],
      status: json['status'] as String? ?? 'active',
      category: json['category'] as String?,
      condition: json['condition'] as String?,
      openTo: json['open_to'] as String?,
      location: json['location'] as String?,
      listingType: json['listing_type'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      sellerName: seller?['full_name'] as String?,
      sellerUniversity: seller?['university'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

const productCategories = <String, String>{
  'textbooks': 'Textbooks',
  'electronics': 'Electronics',
  'fashion': 'Fashion',
  'hostel': 'Hostel',
  'services': 'Services',
  'other': 'Other',
};
