-- Companion to get_my_kyc_status() (017_products_kyc_gate.sql). Without this,
-- a mobile user has no way to ever reach school_id_status = 'approved' and
-- the Sell screen (gated on that status) would be a permanent dead end —
-- school_id_status/school_id_url aren't in the authenticated UPDATE grant
-- (015_launch_hardening.sql), so the client can't set them directly. Mirrors
-- submitSchoolId() in app/actions/kyc.ts. NIN verification (Prembly, needs a
-- secret key) stays a Phase 2 /api/mobile route — it isn't required to sell.
CREATE OR REPLACE FUNCTION submit_school_id(p_school_id_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_current_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Must be the caller's own folder in the private school-ids bucket
  -- (storage RLS in 015_launch_hardening.sql enforces the same prefix).
  IF p_school_id_path IS NULL OR p_school_id_path NOT LIKE (v_uid::text || '/%') THEN
    RAISE EXCEPTION 'INVALID_PATH';
  END IF;

  SELECT school_id_status INTO v_current_status FROM profiles WHERE id = v_uid;

  IF v_current_status = 'approved' THEN
    RAISE EXCEPTION 'ALREADY_APPROVED';
  END IF;
  IF v_current_status = 'pending' THEN
    RAISE EXCEPTION 'ALREADY_PENDING';
  END IF;

  UPDATE profiles
  SET school_id_url = p_school_id_path, school_id_status = 'pending'
  WHERE id = v_uid;

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION submit_school_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_school_id(TEXT) TO authenticated;
