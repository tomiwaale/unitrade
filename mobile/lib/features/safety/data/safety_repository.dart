import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client.dart';
import 'models.dart';

/// Mirrors lib/safety.ts on the web. Blocking is a plain table write and
/// reporting is one RPC — 031_user_safety.sql enforces both in the database,
/// so neither needs an app/api/mobile route the way checkout or KYC do.
class SafetyRepository {
  String get _myId => supabase.auth.currentUser!.id;

  Future<void> blockUser(String blockedId) async {
    try {
      await supabase.from('blocked_users').insert({
        'blocker_id': _myId,
        'blocked_id': blockedId,
      });
    } on PostgrestException catch (e) {
      // Already blocked — the button is idempotent from the user's side.
      if (e.code == '23505') return;
      throw SafetyException('Could not block this user. Please try again.');
    }
  }

  Future<void> unblockUser(String blockedId) async {
    try {
      await supabase
          .from('blocked_users')
          .delete()
          .eq('blocker_id', _myId)
          .eq('blocked_id', blockedId);
    } on PostgrestException {
      throw SafetyException('Could not unblock this user. Please try again.');
    }
  }

  Future<List<BlockedAccount>> fetchBlockedAccounts() async {
    final rows = await supabase
        .from('blocked_users')
        .select('id, blocked_id, created_at, '
            'blocked:profiles!blocked_users_blocked_id_fkey(full_name)')
        .eq('blocker_id', _myId)
        .order('created_at', ascending: false);

    return (rows as List)
        .map((row) => BlockedAccount.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  /// The ids this user has blocked. Used to keep blocked sellers' listings out
  /// of the catalog — the products RLS policy deliberately stops at
  /// suspension, so that blocking someone mid-escrow does not make the product
  /// row vanish from an order already paid for.
  Future<List<String>> fetchBlockedUserIds() async {
    // The catalog is browsable logged out, where there is nothing to filter.
    if (supabase.auth.currentUser == null) return const [];

    try {
      final rows = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', _myId);

      return (rows as List).map((row) => row['blocked_id'] as String).toList();
    } catch (_) {
      // A catalog that fails open beats a catalog that fails to load.
      return const [];
    }
  }

  Future<void> report({
    required ReportTargetType targetType,
    required String targetId,
    required ReportReason reason,
    String? details,
  }) async {
    try {
      await supabase.rpc('report_content', params: {
        'p_target_type': targetType.value,
        'p_target_id': targetId,
        'p_reason': reason.value,
        'p_details': (details?.trim().isEmpty ?? true) ? null : details!.trim(),
      });
    } on PostgrestException catch (e) {
      throw SafetyException(_describeReportError(e.message));
    }
  }

  static String _describeReportError(String message) {
    if (message.contains('ALREADY_REPORTED')) {
      return "You've already reported this — our team is looking at it.";
    }
    if (message.contains('REPORT_RATE_LIMIT')) {
      return "You've filed a lot of reports in the last hour. Try again later.";
    }
    if (message.contains('CANNOT_REPORT_SELF')) {
      return 'You cannot report your own content.';
    }
    if (message.contains('TARGET_NOT_FOUND')) {
      return 'That content is no longer available.';
    }
    return 'Could not submit the report. Please try again.';
  }
}

/// moderate_message_content() (031_user_safety.sql) raises
/// `MESSAGE_BLOCKED_<CATEGORY>` from a BEFORE INSERT trigger; a blocked
/// conversation fails the INSERT policy instead and arrives as 42501. Both
/// reach Flutter as an opaque PostgrestException, so both need translating
/// before a user sees them.
String? describeMessageError(Object error) {
  if (error is! PostgrestException) return null;

  final message = error.message;

  if (message.contains('MESSAGE_BLOCKED_')) {
    if (message.contains('SEXUAL_CONTENT')) {
      return "This message looks like it contains sexual content, which isn't allowed on UniTrade.";
    }
    if (message.contains('HATE_SPEECH')) {
      return "This message contains language that isn't allowed on UniTrade.";
    }
    if (message.contains('VIOLENCE')) {
      return "This message reads as a threat, which isn't allowed on UniTrade.";
    }
    return "This message breaks our community rules and wasn't sent.";
  }

  // 42501 = new row violates row-level security policy. On messages that is a
  // block or a suspension; there is no third way to fail this insert.
  if (error.code == '42501') {
    return 'You can no longer send messages in this conversation.';
  }

  return null;
}
