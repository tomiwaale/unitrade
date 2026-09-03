import 'dart:convert';

import 'package:http/http.dart' as http;

import '../supabase/supabase_client.dart';

class MobileApiException implements Exception {
  MobileApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Thin client for the /api/mobile/* Next.js routes — anything the mobile
/// app can't do with a direct Supabase call because it needs a secret key
/// (Paystack, Prembly). Attaches the current Supabase session's access
/// token as a Bearer header; the routes validate it via
/// lib/supabase/mobile.ts:getMobileUser on the server (cookie auth isn't
/// available to a non-browser client).
class MobileApiClient {
  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body}) {
    return _send('POST', path, body: body);
  }

  Future<Map<String, dynamic>> get(String path) {
    return _send('GET', path);
  }

  Future<Map<String, dynamic>> _send(String method, String path, {Map<String, dynamic>? body}) async {
    final token = supabase.auth.currentSession?.accessToken;
    final uri = Uri.parse('$apiBaseUrl$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final response = method == 'GET'
        ? await http.get(uri, headers: headers)
        : await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);

    Map<String, dynamic> decoded;
    try {
      decoded = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      decoded = {};
    }

    if (response.statusCode >= 400) {
      throw MobileApiException((decoded['error'] as String?) ?? 'Request failed (${response.statusCode})');
    }

    return decoded;
  }
}
