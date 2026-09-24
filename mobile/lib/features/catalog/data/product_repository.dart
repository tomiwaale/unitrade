import '../../../core/supabase/supabase_client.dart';
import 'product.dart';

/// Columns are selected explicitly to match the column-level grants on
/// products/profiles (015_launch_hardening.sql) — selecting `*` on the
/// embedded profile would fail since most profile columns aren't public.
const productSelect =
    'id, seller_id, title, description, price, images, status, category, '
    'condition, open_to, location, listing_type, allow_offers, latitude, longitude, created_at, '
    'seller:profiles(full_name, university)';

class ProductRepository {
  Future<List<Product>> fetchActiveProducts({String? category, String? search}) async {
    var query = supabase.from('products').select(productSelect).eq('status', 'active');

    if (category != null && category.isNotEmpty) {
      query = query.eq('category', category);
    }
    if (search != null && search.trim().isNotEmpty) {
      query = query.ilike('title', '%${search.trim()}%');
    }

    final rows = await query.order('created_at', ascending: false);
    return (rows as List).map((row) => Product.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<Product> fetchProduct(String id) async {
    final row = await supabase.from('products').select(productSelect).eq('id', id).single();
    return Product.fromJson(row);
  }
}
