import '../../../core/supabase/supabase_client.dart';
import 'models.dart';

/// Mirrors app/notifications/page.tsx + mark-all-read.tsx — direct table
/// access; RLS scopes rows to their owner and only the `read` column is
/// client-writable (012_notifications.sql, 015_launch_hardening.sql).
class NotificationRepository {
  Future<List<AppNotification>> fetchRecent() async {
    final userId = supabase.auth.currentUser!.id;
    final rows = await supabase
        .from('notifications')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(50);
    return (rows as List).map((r) => AppNotification.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<void> markRead(String id) async {
    await supabase.from('notifications').update({'read': true}).eq('id', id);
  }

  Future<void> markAllRead() async {
    final userId = supabase.auth.currentUser!.id;
    await supabase.from('notifications').update({'read': true}).eq('user_id', userId).eq('read', false);
  }
}
