import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import 'order_models.dart';

const _orderDetailSelect = 'id, amount, status, created_at, auto_release_at, '
    'confirmed_at, disputed_at, buyer_id, '
    'products(id, title, price, images, seller_id, profiles(full_name, university)), '
    'reviews(id)';

/// Mirrors app/orders/page.tsx and app/orders/[id]/page.tsx for reads
/// (direct Supabase — orders SELECT is RLS-scoped to buyer/seller, see
/// schema.sql). Mutations (confirm/dispute) go through /api/mobile/orders/*
/// since they need the service-role client and Paystack settlement — see
/// lib/orders.ts on the server.
class OrderRepository {
  final _api = MobileApiClient();

  String get _myId => supabase.auth.currentUser!.id;

  Future<List<OrderSummary>> fetchPurchases() async {
    final rows = await supabase
        .from('orders')
        .select('id, amount, status, created_at, products(id, title, images)')
        .eq('buyer_id', _myId)
        .order('created_at', ascending: false);
    return (rows as List).map((r) => OrderSummary.fromBuyerRow(r as Map<String, dynamic>)).toList();
  }

  Future<List<OrderSummary>> fetchSales() async {
    final myProducts = await supabase.from('products').select('id').eq('seller_id', _myId);
    final productIds = (myProducts as List).map((p) => p['id'] as String).toList();
    if (productIds.isEmpty) return [];

    final rows = await supabase
        .from('orders')
        .select('id, amount, status, created_at, products(id, title, images), profiles(full_name)')
        .inFilter('product_id', productIds)
        .order('created_at', ascending: false);
    return (rows as List).map((r) => OrderSummary.fromSellerRow(r as Map<String, dynamic>)).toList();
  }

  Future<OrderDetail> fetchOrder(String id) async {
    final row = await supabase.from('orders').select(_orderDetailSelect).eq('id', id).single();
    return OrderDetail.fromJson(row);
  }

  /// Releases escrow. Server-side this is buyer-only
  /// (lib/orders.ts:confirmOrderReceived), which is why the handover flow has
  /// the *seller* show the code and the buyer enter it — see
  /// presentation/handover_screen.dart.
  Future<void> confirmReceived(String orderId) async {
    await _api.post('/api/mobile/orders/$orderId/confirm');
  }

  /// Uploads one dispute evidence photo and returns its **storage path**
  /// (not a public URL): dispute-evidence is a private bucket
  /// (026_dispute_details.sql), and /admin/disputes/[id] signs these paths
  /// when a moderator opens the case.
  Future<String> uploadDisputeEvidence(Uint8List bytes, {required String extension}) async {
    final path = '$_myId/${DateTime.now().microsecondsSinceEpoch}.$extension';
    await supabase.storage.from('dispute-evidence').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg'),
        );
    return path;
  }

  Future<void> dispute(
    String orderId, {
    required String reason,
    required String explanation,
    List<String> evidence = const [],
  }) async {
    await _api.post('/api/mobile/orders/$orderId/dispute', body: {
      'reason': reason,
      'explanation': explanation,
      'evidence': evidence,
    });
  }
}
