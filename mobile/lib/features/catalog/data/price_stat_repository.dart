import '../../../core/supabase/supabase_client.dart';
import 'price_stat.dart';

/// Reads the campus price bands through get_price_stats()
/// (034_price_stats_access.sql). The price_stats view itself is granted to
/// nobody — a materialized view cannot carry RLS — so a SECURITY DEFINER
/// function is the only way a client holding the anon key can see it.
class PriceStatRepository {
  Future<PriceStats> fetch() async {
    try {
      final rows = await supabase.rpc<dynamic>('get_price_stats');
      return rows is List ? PriceStats.fromRows(rows) : PriceStats.empty;
    } catch (_) {
      // Deal badges are a garnish on the feed, not the feed. A project without
      // 034_price_stats_access.sql applied yet answers this with a 404, and
      // browsing has to keep working regardless — so the failure is swallowed
      // and the cards simply render without badges.
      return PriceStats.empty;
    }
  }
}
