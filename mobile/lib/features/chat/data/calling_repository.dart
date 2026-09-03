import '../../../core/supabase/supabase_client.dart';

class NoSharedRelationshipException implements Exception {}

/// Calls get_counterpart_phone() (016_mobile_support.sql) — the phone
/// number is only ever revealed when the caller already shares a
/// conversation or order with the other user, so this can only be invoked
/// from a screen where that's already true (the chat conversation screen).
class CallingRepository {
  Future<String> getCounterpartPhone(String otherUserId) async {
    try {
      final result = await supabase
          .rpc('get_counterpart_phone', params: {'p_other_user_id': otherUserId});
      return result as String;
    } on Object catch (e) {
      if (e.toString().contains('NO_SHARED_RELATIONSHIP')) {
        throw NoSharedRelationshipException();
      }
      rethrow;
    }
  }
}
