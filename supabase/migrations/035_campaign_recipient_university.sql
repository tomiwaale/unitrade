-- Carry each recipient's university into the send path.
--
-- marketing_audience() already returns university and resolveAudience() reads
-- it, but it was dropped on the floor at queue time: email_campaign_recipients
-- had nowhere to store it and claim_campaign_recipients didn't return it, so
-- the drain loop rendered every campaign with university = NULL. The result was
-- that {{university}} — advertised in the composer's merge-tag list — always
-- fell back to "your campus", for everyone, on every send.

ALTER TABLE email_campaign_recipients ADD COLUMN IF NOT EXISTS university text;

-- Campaigns queued before this migration have the column empty. Recipients who
-- came from an audience segment have a user_id to look it up from; addresses
-- from a manual list have no profile and correctly stay NULL.
UPDATE email_campaign_recipients r
SET university = p.university
FROM profiles p
WHERE p.id = r.user_id
  AND r.university IS NULL
  AND r.status IN ('pending', 'sending');

-- The return type changes, so this can't be a plain CREATE OR REPLACE.
DROP FUNCTION IF EXISTS claim_campaign_recipients(uuid, integer);

CREATE FUNCTION claim_campaign_recipients(p_campaign_id uuid, p_limit integer)
RETURNS TABLE (id uuid, email text, full_name text, university text, user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE email_campaign_recipients r
  SET status = 'sending', claimed_at = now()
  WHERE r.id IN (
    SELECT c.id
    FROM email_campaign_recipients c
    WHERE c.campaign_id = p_campaign_id AND c.status = 'pending'
    ORDER BY c.created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING r.id, r.email, r.full_name, r.university, r.user_id;
$$;

REVOKE ALL ON FUNCTION claim_campaign_recipients(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_campaign_recipients(uuid, integer) TO service_role;
