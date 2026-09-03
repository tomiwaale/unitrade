import '../supabase/supabase_client.dart';

class DeviceTokenRepository {
  Future<void> registerToken(String token, String platform) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;

    await supabase.from('device_tokens').upsert(
      {
        'user_id': userId,
        'token': token,
        'platform': platform,
        'updated_at': DateTime.now().toIso8601String(),
      },
      onConflict: 'token',
    );
  }
}
