/// Mirrors the `reviews` table (supabase/migrations/011_reviews.sql). There
/// is no aggregate rating column anywhere in the schema — average and count
/// are always computed at read time from raw rows, same as
/// app/product/[id]/page.tsx and app/profile/page.tsx do on the web.
class SellerRatingSummary {
  const SellerRatingSummary({required this.average, required this.count});

  final double? average;
  final int count;

  static const empty = SellerRatingSummary(average: null, count: 0);

  factory SellerRatingSummary.fromRatings(List<int> ratings) {
    if (ratings.isEmpty) return empty;
    final avg = ratings.reduce((a, b) => a + b) / ratings.length;
    return SellerRatingSummary(average: avg, count: ratings.length);
  }
}
