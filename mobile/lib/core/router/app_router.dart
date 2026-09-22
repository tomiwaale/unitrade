import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_providers.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/catalog/catalog_screen.dart';
import '../../features/chat/chat_list_screen.dart';
import '../../features/chat/data/models.dart';
import '../../features/chat/presentation/conversation_screen.dart';
import '../../features/checkout/presentation/checkout_webview_screen.dart';
import '../../features/kyc/presentation/kyc_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/orders/orders_screen.dart';
import '../../features/orders/presentation/order_detail_screen.dart';
import '../../features/payout/presentation/payout_screen.dart';
import '../../features/product/presentation/product_detail_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/safety/presentation/blocked_accounts_screen.dart';
import '../../features/sell/edit_listing_screen.dart';
import '../../features/sell/my_listings_screen.dart';
import '../../features/sell/sell_screen.dart';
import '../../features/swaps/presentation/propose_swap_screen.dart';
import '../../features/swaps/swaps_screen.dart';
import '../supabase/supabase_client.dart';
import 'main_shell.dart';

const _authRoutes = {'/login', '/register', '/forgot-password'};

/// Lets code outside the widget tree (the push-notification tap handler in
/// core/push/push_service.dart) navigate without needing a BuildContext.
final rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _GoRouterRefreshStream(
    ref.watch(authRepositoryProvider).onAuthStateChange,
  );
  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/login',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final loggedIn = supabase.auth.currentSession != null;
      final onAuthRoute = _authRoutes.contains(state.matchedLocation);

      if (!loggedIn && !onAuthRoute) return '/login';
      if (loggedIn && onAuthRoute) return '/catalog';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) => ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/messages/:id',
        builder: (context, state) => ConversationScreen(
          conversationId: state.pathParameters['id']!,
          summary: state.extra as ConversationSummary?,
        ),
      ),
      GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: '/orders', builder: (context, state) => const OrdersScreen()),
      GoRoute(
        path: '/orders/:id',
        builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => CheckoutWebViewScreen(checkoutUrl: state.extra as String),
      ),
      GoRoute(path: '/kyc', builder: (context, state) => const KycScreen()),
      GoRoute(
        path: '/swaps/propose/:productId',
        builder: (context, state) => ProposeSwapScreen(productId: state.pathParameters['productId']!),
      ),
      GoRoute(path: '/payout', builder: (context, state) => const PayoutScreen()),
      GoRoute(
        path: '/account/blocked',
        builder: (context, state) => const BlockedAccountsScreen(),
      ),
      GoRoute(path: '/my-listings', builder: (context, state) => const MyListingsScreen()),
      GoRoute(
        path: '/my-listings/:id/edit',
        builder: (context, state) => EditListingScreen(productId: state.pathParameters['id']!),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/catalog', builder: (context, state) => const CatalogScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/swaps', builder: (context, state) => const SwapsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/sell', builder: (context, state) => const SellScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/messages', builder: (context, state) => const ChatListScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
});

/// Bridges Supabase's auth-state Stream to go_router's Listenable
/// refresh hook, so a sign-in/sign-out re-evaluates `redirect` immediately.
class _GoRouterRefreshStream extends ChangeNotifier {
  _GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
