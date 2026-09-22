-- The web's createProduct() server action (app/actions/product.ts) only lets
-- school-ID-verified sellers create listings, but that check lives purely in
-- application code — nothing stops a direct INSERT (which the mobile app
-- does, going straight to Supabase) from bypassing it. Move the same rule
-- into the RLS policy so it's enforced no matter which client is writing.
-- Editing an existing listing was never gated this way on web, so UPDATE is
-- left untouched.
DROP POLICY IF EXISTS "Sellers can insert their own products." ON products;
CREATE POLICY "Verified sellers can insert their own products." ON products
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND school_id_status = 'approved'
    )
  );

-- ── Self KYC status lookup ───────────────────────────────────────────────────
-- school_id_status/nin_verified are intentionally excluded from the public
-- SELECT grant (015_launch_hardening.sql) — the web reads its own status via
-- the service-role admin client (getMyKycStatus() in app/actions/kyc.ts).
-- The mobile app has no service-role key, so it needs an equivalent scoped
-- to the caller's own row.
CREATE OR REPLACE FUNCTION get_my_kyc_status()
RETURNS TABLE (
  school_id_status TEXT,
  school_id_url TEXT,
  nin_verified BOOLEAN,
  nin_last4 TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  RETURN QUERY
  SELECT p.school_id_status, p.school_id_url, p.nin_verified, p.nin_last4
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION get_my_kyc_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_kyc_status() TO authenticated;
