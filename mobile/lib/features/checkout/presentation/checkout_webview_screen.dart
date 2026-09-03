import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Loads the Paystack hosted checkout in a WebView. Paystack's callback_url
/// (set server-side to /api/paystack/callback — see lib/checkout.ts) does
/// all the real work: verifying the payment, marking the order paid, and
/// sending notifications/emails. That route finishes by redirecting to the
/// web's /orders page; we detect that redirect by URL path rather than
/// letting the WebView actually show it, and hand control back to the
/// native app instead. Pops `true` once that redirect is seen, `false` if
/// the user backs out first.
class CheckoutWebViewScreen extends StatefulWidget {
  const CheckoutWebViewScreen({super.key, required this.checkoutUrl});

  final String checkoutUrl;

  @override
  State<CheckoutWebViewScreen> createState() => _CheckoutWebViewScreenState();
}

class _CheckoutWebViewScreenState extends State<CheckoutWebViewScreen> {
  late final WebViewController _controller;
  double _progress = 0;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _progress = progress / 100);
          },
          onPageStarted: (url) => _maybeComplete(url),
          onNavigationRequest: (request) {
            if (_isCallbackComplete(request.url)) {
              _maybeComplete(request.url);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  bool _isCallbackComplete(String url) => Uri.tryParse(url)?.path.startsWith('/orders') ?? false;

  void _maybeComplete(String url) {
    if (_done || !_isCallbackComplete(url)) return;
    _done = true;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: Column(
        children: [
          if (_progress < 1) LinearProgressIndicator(value: _progress),
          Expanded(child: WebViewWidget(controller: _controller)),
        ],
      ),
    );
  }
}
