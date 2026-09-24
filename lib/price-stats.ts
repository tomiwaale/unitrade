// Reads of the price_stats materialized view (032_price_stats.sql) and the rule
// that turns a band into something worth saying to a seller.
//
// Deliberately free of server imports: the sell form is a client component and
// re-evaluates the guidance on every keystroke, so the whole stats table is
// handed to it as a prop and the lookup happens locally. The table is one row
// per (category, condition) — tens of rows, not thousands.

export const ANY_CONDITION = "*";

// Above this multiple of the median we stop hedging and name the number. Picked
// to sit well clear of legitimate spread: a genuinely new-in-box item in a
// bucket of worn ones can reach ~1.5x the median without anything being wrong.
const GOUGE_MULTIPLE = 2;

export type PriceSource = "sold" | "listed";

export type PriceStat = {
  category: string;
  /** A condition value, 'unspecified', or ANY_CONDITION for the rollup row. */
  condition: string;
  source: PriceSource;
  sample_count: number;
  p25: number;
  p50: number;
  p75: number;
};

export const PRICE_STATS_COLUMNS =
  "category, condition, source, sample_count, p25, p50, p75";

/** PostgREST hands NUMERIC back inconsistently across versions — coerce it. */
export function normalizePriceStats(rows: unknown): PriceStat[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r) => {
    const row = r as Record<string, unknown>;
    const p25 = Number(row.p25);
    const p50 = Number(row.p50);
    const p75 = Number(row.p75);
    if (!Number.isFinite(p25) || !Number.isFinite(p50) || !Number.isFinite(p75)) return [];
    if (typeof row.category !== "string" || typeof row.condition !== "string") return [];
    return [{
      category: row.category,
      condition: row.condition,
      source: row.source === "sold" ? "sold" : "listed",
      sample_count: Number(row.sample_count) || 0,
      p25, p50, p75,
    }];
  });
}

/**
 * Exact (category, condition) first, then the any-condition rollup. Condition
 * buckets run dry long before category ones do, so most early listings will
 * match on the fallback.
 */
export function lookupPriceStat(
  stats: PriceStat[],
  category: string,
  condition: string,
): PriceStat | null {
  if (!category) return null;
  return (
    stats.find((s) => s.category === category && s.condition === condition) ??
    stats.find((s) => s.category === category && s.condition === ANY_CONDITION) ??
    null
  );
}

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export type PriceTone = "info" | "good" | "warn" | "high";

export type PriceGuidance = {
  tone: PriceTone;
  headline: string;
  detail: string;
  /** Rendered range, p25–p75. */
  band: string;
  /** Where the band came from, for the seller to judge how much to trust it. */
  basis: string;
  stat: PriceStat;
};

/**
 * Null whenever we have nothing honest to say — no category picked yet, or no
 * bucket cleared the sample floor in the view. Silence beats a made-up market.
 */
export function priceGuidance(
  stats: PriceStat[],
  category: string,
  condition: string,
  price: number | null,
  categoryLabel: string,
): PriceGuidance | null {
  const stat = lookupPriceStat(stats, category, condition);
  if (!stat) return null;

  const band = `${formatNaira(stat.p25)}–${formatNaira(stat.p75)}`;

  // Category labels are not uniformly plural nouns — "Textbooks" takes a plural
  // verb, "Clothing" and "Hostel" do not — so the subject is built as
  // "<condition> listings in <Category>", which reads correctly with every
  // label the form can produce and every legacy value already in the column.
  const qualifier =
    stat.condition === ANY_CONDITION || stat.condition === "unspecified"
      ? ""
      : `${stat.condition} `;
  const subject = `${qualifier}listings in ${categoryLabel}`;

  const basis =
    stat.source === "sold"
      ? `Based on ${stat.sample_count} completed ${stat.sample_count === 1 ? "sale" : "sales"} on KolejSwap.`
      : `Based on ${stat.sample_count} active ${stat.sample_count === 1 ? "listing" : "listings"} — nothing in this category has sold yet.`;

  const base = { band, basis, stat };

  if (price === null || !Number.isFinite(price) || price <= 0) {
    return {
      ...base,
      tone: "info",
      headline: `Similar ${subject} sell for ${band}`,
      // The basis line carries the rest; a second sentence here would just
      // restate it back to the seller.
      detail: "",
    };
  }

  const multiple = price / stat.p50;

  if (multiple > GOUGE_MULTIPLE) {
    const rounded = multiple >= 10 ? Math.round(multiple) : Math.round(multiple * 10) / 10;
    return {
      ...base,
      tone: "high",
      headline: `That's ${rounded}× the typical price`,
      detail: `Most ${subject} go for ${band}. Listings this far above the market almost never sell.`,
    };
  }

  if (price > stat.p75) {
    return {
      ...base,
      tone: "warn",
      headline: "Above the typical range",
      detail: `Most ${subject} go for ${band}. Yours can still sell — it will just take longer.`,
    };
  }

  if (price < stat.p25) {
    return {
      ...base,
      tone: "good",
      headline: "Priced below the typical range",
      detail: `Most ${subject} go for ${band}. Yours should move fast.`,
    };
  }

  return {
    ...base,
    tone: "good",
    headline: "Right in the typical range",
    detail: `Most ${subject} go for ${band}.`,
  };
}

// ── Deal badges ───────────────────────────────────────────────────────────────
// The buyer-facing half of the same bands. `priceGuidance` above talks a seller
// through their own price in full sentences; this reduces the same comparison to
// something that fits on a listing card.
//
// This is the canonical definition of the rule. It is mirrored in
// mobile/lib/features/catalog/data/price_stat.dart, which is where it currently
// renders (the Flutter feed); keep the two in step.

export type DealTier = "great-deal" | "fair-price";

export const DEAL_TIER_LABELS: Record<DealTier, string> = {
  "great-deal": "Great deal",
  "fair-price": "Fair price",
};

/**
 * Null whenever there is nothing honest to say: no band for this category, or a
 * price above the typical range.
 *
 * Nothing here badges a listing as *over*priced. Overpricing is answered where
 * it starts — the nudge on the sell form — because a scarlet letter on someone's
 * card pushes them to relist off-platform, which costs the buyer escrow
 * protection and tells us nothing.
 */
export function dealTier(
  stats: PriceStat[],
  category: string | null | undefined,
  condition: string | null | undefined,
  price: number,
): DealTier | null {
  if (!category || !Number.isFinite(price) || price <= 0) return null;

  // Normalised here rather than in lookupPriceStat, whose existing callers pass
  // the sell form's raw "" for an unset condition and rely on falling through to
  // the any-condition rollup.
  const bucket = condition?.trim() ? condition : "unspecified";
  const stat = lookupPriceStat(stats, category, bucket);
  if (!stat) return null;

  // The strong claim needs strong evidence. On a band built only from asking
  // prices, "cheapest quarter" means cheapest among other people's hopes — if a
  // whole category is overpriced that band is inflated, and a merely ordinary
  // price would wear a "Great deal" badge. Those listings fall through to
  // "Fair price", which is still true, and graduate on their own once the
  // category has sales behind it.
  if (price <= stat.p25 && stat.source === "sold") return "great-deal";
  if (price <= stat.p75) return "fair-price";
  return null;
}
