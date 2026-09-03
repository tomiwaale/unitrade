import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../catalog/data/product.dart';
import 'swap_models.dart';

const _swapOfferSelect = 'id, status, note, cash_topup, created_at, buyer_id, seller_id, '
    'wanted_product:wanted_product_id(id, title, images, price), '
    'offered_product:offered_product_id(id, title, images, price), '
    'buyer:buyer_id(full_name), seller:seller_id(full_name)';

/// Mirrors app/swaps/page.tsx for reads (direct Supabase — swap_offers
/// SELECT is RLS-scoped to buyer/seller, see 010_swap_offers.sql) and
/// app/product/[id]/propose-swap-btn.tsx for the "pick one of my listings"
/// query. Mutations (propose/respond/cancel) go through /api/mobile/swaps/*
/// since propose needs the chat+notification side effects and
/// respond/cancel need the service-role client — UPDATE on swap_offers is
/// revoked for authenticated users (015_launch_hardening.sql). See lib/swap.ts
/// on the server.
class SwapRepository {
  final _api = MobileApiClient();

  String get _myId => supabase.auth.currentUser!.id;

  Future<List<SwapOffer>> fetchReceived() async {
    final rows = await supabase
        .from('swap_offers')
        .select(_swapOfferSelect)
        .eq('seller_id', _myId)
        .order('created_at', ascending: false);
    return (rows as List).map((r) => SwapOffer.fromReceivedRow(r as Map<String, dynamic>)).toList();
  }

  Future<List<SwapOffer>> fetchSent() async {
    final rows = await supabase
        .from('swap_offers')
        .select(_swapOfferSelect)
        .eq('buyer_id', _myId)
        .order('created_at', ascending: false);
    return (rows as List).map((r) => SwapOffer.fromSentRow(r as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> fetchMyActiveListings(String excludeProductId) async {
    final rows = await supabase
        .from('products')
        .select('id, seller_id, title, description, price, images, status, category, created_at')
        .eq('seller_id', _myId)
        .eq('status', 'active')
        .order('created_at', ascending: false);
    return (rows as List)
        .map((r) => Product.fromJson(r as Map<String, dynamic>))
        .where((p) => p.id != excludeProductId)
        .toList();
  }

  Future<void> propose({
    required String wantedProductId,
    required String offeredProductId,
    String? note,
    double? cashTopup,
  }) {
    return _api.post('/api/mobile/swaps', body: {
      'wantedProductId': wantedProductId,
      'offeredProductId': offeredProductId,
      if (note != null && note.isNotEmpty) 'note': note,
      if (cashTopup != null && cashTopup > 0) 'cashTopup': cashTopup,
    });
  }

  Future<void> respond(String swapId, String action) {
    return _api.post('/api/mobile/swaps/$swapId/respond', body: {'action': action});
  }

  Future<void> cancel(String swapId) {
    return _api.post('/api/mobile/swaps/$swapId/cancel');
  }
}
