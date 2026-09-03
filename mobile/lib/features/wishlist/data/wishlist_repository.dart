import '../../../core/supabase/supabase_client.dart';
import '../../catalog/data/product.dart';

const _wishlistedProductSelect = 'created_at, '
    'product:products(id, seller_id, title, description, price, images, status, category, '
    'condition, open_to, location, listing_type, latitude, longitude, created_at, '
    'seller:profiles(full_name, university))';

/// Mirrors app/actions/wishlist.ts — direct table access, RLS already scopes
/// everything to the caller's own rows (015_launch_hardening.sql). The web
/// only ever toggles wishlist state inline on the catalog grid — there's no
/// dedicated "view my wishlist" surface there either; fetchWishlistedProducts
/// is new for the mobile wishlist modal.
class WishlistRepository {
  Future<List<Product>> fetchWishlistedProducts() async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return [];

    final rows = await supabase
        .from('wishlists')
        .select(_wishlistedProductSelect)
        .eq('user_id', userId)
        .order('created_at', ascending: false);

    return (rows as List)
        .map((row) => (row as Map<String, dynamic>)['product'] as Map<String, dynamic>?)
        .where((product) => product != null)
        .map((product) => Product.fromJson(product!))
        .toList();
  }

  Future<bool> isWishlisted(String productId) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return false;

    final row = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();
    return row != null;
  }

  Future<void> add(String productId) async {
    final userId = supabase.auth.currentUser!.id;
    await supabase.from('wishlists').insert({'user_id': userId, 'product_id': productId});
  }

  Future<void> remove(String productId) async {
    final userId = supabase.auth.currentUser!.id;
    await supabase.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId);
  }
}
