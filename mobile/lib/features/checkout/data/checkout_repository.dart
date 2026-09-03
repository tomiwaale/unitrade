import '../../../core/api/mobile_api_client.dart';

/// Calls POST /api/mobile/checkout/init (lib/checkout.ts on the server),
/// which does the reserve_product_for_checkout RPC + Paystack transaction
/// init in one step and hands back a hosted checkout URL to open in a
/// WebView — mirrors createCheckoutSession() on the web, which does the
/// same thing but redirects the browser directly instead.
class CheckoutRepository {
  final _api = MobileApiClient();

  Future<String> initCheckout(String productId) async {
    final result = await _api.post('/api/mobile/checkout/init', body: {'productId': productId});
    return result['checkoutUrl'] as String;
  }
}
