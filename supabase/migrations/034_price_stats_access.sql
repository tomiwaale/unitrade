-- ── Client access to the price bands ────────────────────────────────────────
-- 032_price_stats.sql builds price_stats and then grants it to nobody, because
-- a materialized view cannot carry RLS. That was the right call while the only
-- reader was the sell form, which runs on the server and holds the service
-- role key.
--
-- Deal badges move the same numbers onto listing cards, and those render in
-- clients that only ever hold the anon key: the Flutter feed
-- (mobile/lib/features/catalog) above all. So the view stays ungranted and
-- gets one SECURITY DEFINER reader in front of it instead, which is the same
-- shape every other write in 033_price_offers.sql already uses.
--
-- NOTE: the function body references price_stats, and a LANGUAGE sql body is
-- validated at CREATE time, so this migration hard-depends on
-- 032_price_stats.sql having run. That is deliberate — it fails loudly here
-- rather than handing clients a reader over a view that does not exist.

-- Why this is safe to hand to a client, given the view itself is locked down:
--   * Every row is an aggregate over at least 5 observations (the floor is in
--     the view's WHERE clause), and carries only p25/p50/p75 — no individual
--     price, listing or buyer is recoverable from it.
--   * The 'listed' rows aggregate asking prices on active listings, which are
--     already world-readable on the products table.
--   * The 'sold' rows are the point of the feature. A campus price index that
--     buyers cannot see does not curb overpricing.
CREATE OR REPLACE FUNCTION get_price_stats()
RETURNS TABLE (
  category     TEXT,
  condition    TEXT,
  source       TEXT,
  sample_count INT,
  p25          NUMERIC,
  p50          NUMERIC,
  p75          NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.category, ps.condition, ps.source, ps.sample_count, ps.p25, ps.p50, ps.p75
  FROM price_stats ps;
$$;

-- anon as well as authenticated: the web catalog is browsable before sign-in,
-- and a badge that appears only after logging in is a badge that does not do
-- its job.
REVOKE ALL ON FUNCTION get_price_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_price_stats() TO anon, authenticated, service_role;
