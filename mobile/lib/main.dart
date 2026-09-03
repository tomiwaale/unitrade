import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/push/push_service.dart';
import 'core/router/app_router.dart';
import 'core/supabase/supabase_client.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/application/auth_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseBootstrap.init();
  // Fire-and-forget: push is fully optional until a Firebase project is
  // wired up (see mobile/PUSH_SETUP.md) — nothing else should wait on it.
  unawaited(PushService.init());
  runApp(const ProviderScope(child: KolejSwapApp()));
}

class KolejSwapApp extends ConsumerWidget {
  const KolejSwapApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    ref.listen(authStateProvider, (previous, next) {
      final event = next.value?.event;
      if (event == AuthChangeEvent.signedIn) {
        PushService.registerTokenForCurrentUser();
      }
    });

    return MaterialApp.router(
      title: 'KolejSwap',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
