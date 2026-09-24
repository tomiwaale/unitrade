import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client.dart';
import '../../catalog/data/product.dart';
import '../../catalog/data/product_repository.dart';

/// Mirrors app/actions/product.ts:createProduct/updateProduct/deleteProduct
/// — column sets match the authenticated INSERT/UPDATE grants
/// (015_launch_hardening.sql, 016_mobile_support.sql). The
/// school_id_status = 'approved' gate on create is enforced by the products
/// INSERT RLS policy (017_products_kyc_gate.sql), not here. Update/delete
/// need no service-role client: sellers can already update/delete their own
/// rows directly per the "Sellers can update their own products."/"Sellers
/// can delete inactive products without escrow orders." RLS policies.
class SellRepository {
  Future<String> uploadProductImage(Uint8List bytes, {required String extension}) async {
    final userId = supabase.auth.currentUser!.id;
    final path = '$userId/${DateTime.now().microsecondsSinceEpoch}.$extension';

    await supabase.storage.from('product-images').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg'),
        );

    return supabase.storage.from('product-images').getPublicUrl(path);
  }

  Future<void> createProduct({
    required String title,
    required String description,
    required double price,
    required List<String> images,
    required String category,
    String? condition,
    required String openTo,
    required bool allowOffers,
    required String location,
    double? latitude,
    double? longitude,
  }) async {
    final userId = supabase.auth.currentUser!.id;
    final listingType = category == 'services' ? 'service' : 'item';

    await supabase.from('products').insert({
      'seller_id': userId,
      'title': title,
      'description': description,
      'price': price,
      'images': images,
      'category': category,
      'condition': condition,
      'open_to': openTo,
      // A swap-only listing has no cash price to negotiate, so it never takes
      // offers whatever the form said.
      'allow_offers': openTo == 'swap-only' ? false : allowOffers,
      'location': location,
      'listing_type': listingType,
      'latitude': ?latitude,
      'longitude': ?longitude,
    });
  }

  Future<List<Product>> fetchMyListings() async {
    final userId = supabase.auth.currentUser!.id;
    final rows = await supabase
        .from('products')
        .select(productSelect)
        .eq('seller_id', userId)
        .order('created_at', ascending: false);
    return (rows as List).map((r) => Product.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<void> updateProduct({
    required String id,
    required String title,
    required String description,
    required double price,
    required List<String> images,
    required String category,
    String? condition,
    required String openTo,
    required bool allowOffers,
    required String location,
    double? latitude,
    double? longitude,
  }) async {
    final userId = supabase.auth.currentUser!.id;
    final listingType = category == 'services' ? 'service' : 'item';

    await supabase.from('products').update({
      'title': title,
      'description': description,
      'price': price,
      'images': images,
      'category': category,
      'condition': condition,
      'open_to': openTo,
      // A swap-only listing has no cash price to negotiate, so it never takes
      // offers whatever the form said.
      'allow_offers': openTo == 'swap-only' ? false : allowOffers,
      'location': location,
      'listing_type': listingType,
      'latitude': ?latitude,
      'longitude': ?longitude,
    }).eq('id', id).eq('seller_id', userId);
  }

  /// The DELETE RLS policy already blocks removing a product with an order
  /// in pending/paid/confirmed/disputed — but a blocked RLS delete just
  /// silently matches zero rows rather than throwing, so we pre-check here
  /// to surface a real error message instead of a false "success".
  Future<void> deleteProduct(String id) async {
    final activeOrders = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', id)
        .inFilter('status', ['pending', 'paid', 'confirmed', 'disputed']);
    if ((activeOrders as List).isNotEmpty) {
      throw StateError("Can't delete — this item has an active order in escrow");
    }
    await supabase.from('products').delete().eq('id', id);
  }
}
