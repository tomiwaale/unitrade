// Campus price bands, read from the price_stats materialized view
// (032_price_stats.sql) through get_price_stats() (034_price_stats_access.sql),
// and the rule that turns a band into a badge on a listing card.
//
// Mirrors lib/price-stats.ts, which does the same job for the seller-facing
// nudge on the web sell form. The view enforces a floor of 5 observations per
// bucket, so anything that arrives here is already worth saying out loud.

/// The rollup row that ignores condition. Condition buckets run dry long before
/// category ones do, so most lookups land on this.
const anyCondition = '*';

/// What the view stores for a listing whose condition was never set — matches
/// `COALESCE(NULLIF(p.condition, ''), 'unspecified')` in the view.
const unspecifiedCondition = 'unspecified';

class PriceStat {
  PriceStat({
    required this.category,
    required this.condition,
    required this.source,
    required this.sampleCount,
    required this.p25,
    required this.p50,
    required this.p75,
  });

  final String category;

  /// A condition value, [unspecifiedCondition], or [anyCondition].
  final String condition;

  /// 'sold' | 'listed'. A band built from completed orders is evidence of what
  /// things are worth; one built from asking prices is only evidence of what
  /// sellers hoped for, which is the very number that drifts upward.
  final String source;
  final int sampleCount;
  final double p25;
  final double p50;
  final double p75;

  bool get isTransacted => source == 'sold';

  static PriceStat? fromJson(Map<String, dynamic> json) {
    final category = json['category'];
    final condition = json['condition'];
    final p25 = (json['p25'] as num?)?.toDouble();
    final p50 = (json['p50'] as num?)?.toDouble();
    final p75 = (json['p75'] as num?)?.toDouble();

    // NUMERIC can arrive as a string from PostgREST depending on version, and a
    // row we cannot read is dropped rather than defaulted — a made-up band is
    // worse than no badge.
    if (category is! String || condition is! String) return null;
    if (p25 == null || p50 == null || p75 == null) return null;

    return PriceStat(
      category: category,
      condition: condition,
      source: json['source'] == 'sold' ? 'sold' : 'listed',
      sampleCount: (json['sample_count'] as num?)?.toInt() ?? 0,
      p25: p25,
      p50: p50,
      p75: p75,
    );
  }
}

/// How a listing's price sits against its category's band.
enum DealTier {
  /// In the cheapest quarter of what this actually sells for on campus.
  greatDeal,

  /// Inside the typical range. Not a bargain, but not a shakedown either.
  fairPrice,
}

extension DealTierLabel on DealTier {
  String get label => switch (this) {
        DealTier.greatDeal => 'Great deal',
        DealTier.fairPrice => 'Fair price',
      };
}

/// Tens of rows at most, fetched once and shared by every card in the feed, so
/// the per-card lookup is a map hit rather than a query.
class PriceStats {
  PriceStats(this._byKey);

  static final PriceStats empty = PriceStats(const {});

  final Map<String, PriceStat> _byKey;

  bool get isEmpty => _byKey.isEmpty;

  static String _key(String category, String condition) => '$category|$condition';

  factory PriceStats.fromRows(List<dynamic> rows) {
    final byKey = <String, PriceStat>{};
    for (final row in rows) {
      if (row is! Map) continue;
      final stat = PriceStat.fromJson(Map<String, dynamic>.from(row));
      if (stat != null) byKey[_key(stat.category, stat.condition)] = stat;
    }
    return PriceStats(byKey);
  }

  /// Exact (category, condition) first, then the any-condition rollup.
  PriceStat? lookup(String? category, String? condition) {
    if (category == null || category.isEmpty) return null;

    final normalized = (condition == null || condition.trim().isEmpty)
        ? unspecifiedCondition
        : condition;

    return _byKey[_key(category, normalized)] ?? _byKey[_key(category, anyCondition)];
  }

  /// Null whenever there is nothing honest to say: no band for this category, or
  /// a price above the typical range.
  ///
  /// Nothing here badges a listing as *over*priced. Overpricing is answered
  /// where it starts — the nudge on the sell form — because a scarlet letter on
  /// someone's card pushes them to relist off-platform, which costs the buyer
  /// escrow protection and tells us nothing.
  DealTier? tierFor({
    required String? category,
    required String? condition,
    required double price,
  }) {
    final stat = lookup(category, condition);
    if (stat == null || price <= 0) return null;

    // The strong claim needs strong evidence. On a band built only from asking
    // prices, "cheapest quarter" means cheapest among other people's hopes — if
    // a whole category is overpriced, that band is inflated and a merely
    // ordinary price would wear a "Great deal" badge. Those listings fall
    // through to 'Fair price', which is still true, and graduate on their own
    // once the category has sales behind it.
    if (price <= stat.p25 && stat.isTransacted) return DealTier.greatDeal;
    if (price <= stat.p75) return DealTier.fairPrice;
    return null;
  }
}
