import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import 'review_models.dart';

/// Mirrors app/actions/review.ts and the inline average-rating computation
/// used on app/product/[id]/page.tsx and app/profile/page.tsx. Reads go
/// direct-to-Supabase (RLS: "Reviews are viewable by everyone."). Submitting
/// goes through /api/mobile/orders/[id]/review since it needs the
/// service-role client to notify the seller — see lib/reviews.ts on the
/// server.
class ReviewRepository {
  final _api = MobileApiClient();

  Future<SellerRatingSummary> fetchSellerRating(String sellerId) async {
    final rows = await supabase.from('reviews').select('rating').eq('seller_id', sellerId);
    final ratings = (rows as List).map((r) => r['rating'] as int).toList();
    return SellerRatingSummary.fromRatings(ratings);
  }

  Future<void> submitReview(String orderId, int rating, String comment) async {
    await _api.post('/api/mobile/orders/$orderId/review', body: {
      'rating': rating,
      'comment': comment,
    });
  }
}
