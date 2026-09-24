-- ── Price stats ──────────────────────────────────────────────────────────────
-- Overpricing here is an information problem, not a fraud problem: a fresher who
-- has never bought a used MTH101 textbook has no way to know ₦8,000 is triple
-- the going rate. This view gives the sell form (and later the product page) a
-- per-(category, condition) price band, so both sides can see what "normal"
-- looks like before money moves.
--
-- Transacted prices are the truth we want — orders.amount on a deal that
-- completed. An asking price is only what a seller hoped for, which is exactly
-- the number that drifts upward. So we prefer sold data and fall back to active
-- listings only in buckets with too few sales to say anything.

CREATE MATERIALIZED VIEW IF NOT EXISTS price_stats AS
WITH observations AS (
  -- What someone actually paid. ('confirmed', 'released') is the same pair the
  -- product page already counts as a completed deal.
  SELECT
    p.category,
    COALESCE(NULLIF(p.condition, ''), 'unspecified') AS condition,
    o.amount::NUMERIC                                AS price,
    'sold'::TEXT                                     AS source
  FROM orders o
  JOIN products p ON p.id = o.product_id
  WHERE o.status IN ('confirmed', 'released')
    AND o.amount > 0
    AND p.category IS NOT NULL
    -- Textbook and electronics prices move with each intake; a two-year-old
    -- sale is not a comparable.
    AND o.created_at > NOW() - INTERVAL '12 months'

  UNION ALL

  -- Asking prices, used only where sales are too thin to beat them.
  SELECT
    p.category,
    COALESCE(NULLIF(p.condition, ''), 'unspecified'),
    p.price::NUMERIC,
    'listed'
  FROM products p
  WHERE p.status = 'active'
    AND p.price > 0
    AND p.category IS NOT NULL
    AND p.created_at > NOW() - INTERVAL '6 months'
),
per_bucket AS (
  SELECT
    category,
    -- NULL in the second grouping set = the any-condition rollup. Condition
    -- buckets go thin long before category ones do, so the lookup needs
    -- something to fall back to.
    condition,
    source,
    COUNT(*)::INT                                          AS sample_count,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY price)    AS p25,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY price)    AS p50,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY price)    AS p75
  FROM observations
  GROUP BY GROUPING SETS ((category, condition, source), (category, source))
)
SELECT DISTINCT ON (category, COALESCE(condition, '*'))
  category,
  COALESCE(condition, '*')  AS condition,
  source,
  sample_count,
  ROUND(p25)::NUMERIC(12,2) AS p25,
  ROUND(p50)::NUMERIC(12,2) AS p50,
  ROUND(p75)::NUMERIC(12,2) AS p75,
  NOW()                     AS computed_at
FROM per_bucket
-- The floor lives here rather than in the UI so no caller can accidentally
-- render a "typical price" built on two listings. A band we cannot support is
-- worse than no band: it invents a market that does not exist yet.
WHERE sample_count >= 5
ORDER BY category, COALESCE(condition, '*'), (source = 'sold') DESC, sample_count DESC;

-- Required for REFRESH ... CONCURRENTLY, and it is the lookup key besides.
CREATE UNIQUE INDEX IF NOT EXISTS price_stats_key_idx
  ON price_stats(category, condition);

-- A materialized view cannot carry RLS, so the only way to keep it off the
-- public API is to grant nothing. Callers are server components and route
-- handlers holding the service role key.
REVOKE ALL ON price_stats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION refresh_price_stats()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  -- CONCURRENTLY keeps the sell form readable through the refresh, but it
  -- requires an already-populated view — which is not true on a fresh restore.
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY price_stats;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW price_stats;
  END;

  SELECT COUNT(*) INTO v_rows FROM price_stats;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION refresh_price_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_price_stats() TO service_role;
