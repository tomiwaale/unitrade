-- Companion to get_my_kyc_status() — profiles.bank_name/account_name/
-- account_number aren't in the authenticated SELECT grant
-- (015_launch_hardening.sql; the web reads them via the service-role admin
-- client in app/profile/page.tsx). Mobile needs its own way to show "payout
-- already configured" without a service-role key.
CREATE OR REPLACE FUNCTION get_my_payout_status()
RETURNS TABLE (
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  has_subaccount BOOLEAN
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
  SELECT p.bank_name, p.account_name, p.account_number, (p.subaccount_code IS NOT NULL)
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION get_my_payout_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_payout_status() TO authenticated;
