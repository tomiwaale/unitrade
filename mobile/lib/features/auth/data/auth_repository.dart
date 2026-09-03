import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client.dart';

class RegisterInput {
  RegisterInput({
    required this.fullName,
    required this.email,
    required this.phone,
    required this.password,
    required this.university,
  });

  final String fullName;
  final String email;
  final String phone;
  final String password;
  final String university;

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'university': university,
      };
}

/// Mirrors app/actions/auth.ts on the web. Sign-in and password reset go
/// straight to Supabase; registration goes through POST /api/mobile/register
/// first (it needs the service-role client for the phone-uniqueness check —
/// see lib/auth.ts:registerUser on the server), then signs in with the same
/// credentials to establish the on-device session.
class AuthRepository {
  Stream<AuthState> get onAuthStateChange => supabase.auth.onAuthStateChange;

  User? get currentUser => supabase.auth.currentUser;

  Future<void> signIn({required String email, required String password}) async {
    await supabase.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> register(RegisterInput input) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/api/mobile/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(input.toJson()),
    );

    if (response.statusCode != 200) {
      final body = _tryDecode(response.body);
      throw AuthRepositoryException(
        (body?['error'] as String?) ?? 'Failed to create account',
      );
    }

    await signIn(email: input.email, password: input.password);
  }

  Future<void> requestPasswordReset(String email) async {
    await supabase.auth.resetPasswordForEmail(email);
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }

  Map<String, dynamic>? _tryDecode(String body) {
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}

class AuthRepositoryException implements Exception {
  AuthRepositoryException(this.message);
  final String message;

  @override
  String toString() => message;
}
