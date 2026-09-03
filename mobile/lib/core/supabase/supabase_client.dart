import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Bootstraps the same Supabase project the web app uses (URL + anon key
/// only — RLS and the SECURITY DEFINER RPCs already scope what an
/// authenticated client can do, so the mobile app never carries a service
/// role key). Call [SupabaseBootstrap.init] once before runApp().
class SupabaseBootstrap {
  SupabaseBootstrap._();

  static Future<void> init() async {
    await dotenv.load(fileName: '.env');

    await Supabase.initialize(
      url: dotenv.get('SUPABASE_URL'),
      publishableKey: dotenv.get('SUPABASE_ANON_KEY'),
    );
  }
}

SupabaseClient get supabase => Supabase.instance.client;

/// Base URL for the thin /api/mobile/* Next.js routes (registration,
/// Paystack checkout init, KYC) — anything that needs a secret key the
/// mobile app must never hold.
String get apiBaseUrl => dotenv.get('API_BASE_URL');
