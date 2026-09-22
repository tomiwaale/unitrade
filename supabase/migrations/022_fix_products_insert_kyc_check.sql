-- Fixes a live bug in the INSERT policy added by 017_products_kyc_gate.sql:
--
--   CREATE POLICY "Verified sellers can insert their own products." ON products
--     FOR INSERT
--     WITH CHECK (
--       auth.uid() = seller_id
--       AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND school_id_status = 'approved')
--     );
--
-- RLS policy expressions run under the calling role's own privileges, not
-- an elevated one. school_id_status is intentionally excluded from the
-- authenticated SELECT grant (015_launch_hardening.sql) to keep KYC status
-- private, so this subquery fails for every caller with:
--   "permission denied for table profiles" (42501)
-- That means every listing creation — web (app/actions/product.ts inserts
-- via the RLS-scoped cookie client) and mobile (direct RLS-scoped insert)
-- alike — has been failing since this policy was deployed, regardless of
-- the seller's actual KYC status.
--
-- Fix: move the check into a SECURITY DEFINER function, the same pattern
-- already used by get_my_kyc_status() in 017 and submit_school_id() in
-- 018, so it can read school_id_status without granting broad SELECT
-- access to it (which would leak KYC status to any authenticated caller).

CREATE OR REPLACE FUNCTION is_school_id_approved(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND school_id_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION is_school_id_approved(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_school_id_approved(UUID) TO authenticated;

DROP POLICY IF EXISTS "Verified sellers can insert their own products." ON products;
CREATE POLICY "Verified sellers can insert their own products." ON products
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND is_school_id_approved(auth.uid())
  );
