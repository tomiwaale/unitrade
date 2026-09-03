import '../../../core/supabase/supabase_client.dart';
import 'promo_slide.dart';

class PromoSlideRepository {
  Future<List<PromoSlide>> fetchActiveSlides() async {
    final rows = await supabase
        .from('promo_slides')
        .select(
          'id, title, subtitle, icon, color_start, color_end, image_url, route',
        )
        .eq('active', true)
        .order('sort_order', ascending: true);

    return (rows as List)
        .map((row) => PromoSlide.fromJson(row as Map<String, dynamic>))
        .toList();
  }
}
