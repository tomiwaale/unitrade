import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:kolejswap_mobile/core/router/main_shell.dart';
import 'package:kolejswap_mobile/core/theme/app_theme.dart';
import 'package:kolejswap_mobile/features/notifications/application/notifications_providers.dart';
import 'package:kolejswap_mobile/features/swaps/application/swap_providers.dart';

void main() {
  testWidgets('MainShell renders Badge.count when pending swaps or unread messages exist', (tester) async {
    final router = GoRouter(
      initialLocation: '/catalog',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) => MainShell(navigationShell: navigationShell),
          branches: [
            StatefulShellBranch(routes: [
              GoRoute(path: '/catalog', builder: (context, state) => const Text('Catalog Screen')),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(path: '/swaps', builder: (context, state) => const Text('Swaps Screen')),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(path: '/sell', builder: (context, state) => const Text('Sell Screen')),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(path: '/messages', builder: (context, state) => const Text('Messages Screen')),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(path: '/profile', builder: (context, state) => const Text('Profile Screen')),
            ]),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          pendingSwapsCountProvider.overrideWithValue(3),
          unreadMessagesCountProvider.overrideWithValue(5),
        ],
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: router,
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify badges are rendered with counts
    expect(find.text('3'), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    expect(find.byType(Badge), findsNWidgets(2));
  });
}
