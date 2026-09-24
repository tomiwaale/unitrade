import '../../../core/api/mobile_api_client.dart';

/// Calls POST /api/mobile/checkout/init (lib/checkout.ts on the server),
/// which does the reserve_product_for_checkout RPC + Paystack transaction
/// init in one step and hands back a hosted checkout URL to open in a
/// WebView — mirrors createCheckoutSession() on the web, which does the
/// same thing but redirects the browser directly instead.
class CheckoutRepository {
  final _api = MobileApiClient();

  /// [offerId] is the buyer's accepted price offer (033_price_offers.sql). It is
  /// a hint only: reserve_product_for_checkout re-checks that the offer belongs
  /// to this buyer and is still live, and looks one up itself when none is
  /// passed. So the amount charged comes from the database, never from the app.
  Future<String> initCheckout(String productId, {String? offerId}) async {
    final result = await _api.post('/api/mobile/checkout/init', body: {
      'productId': productId,
      'offerId': ?offerId,
    });
    return result['checkoutUrl'] as String;
  }
}
