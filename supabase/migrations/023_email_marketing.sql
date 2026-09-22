-- Email marketing: reusable templates, campaigns, per-recipient delivery rows,
-- and the marketing opt-out flag honoured by every campaign send.
--
-- Transactional email (orders, KYC, payouts) ignores marketing_opt_in — only
-- campaigns sent from /admin/marketing filter on it.

-- ── Opt-out ──────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_out_at TIMESTAMPTZ;

-- Suppression list — covers addresses from manual campaign lists that have no
-- profile row to flag, and survives a user deleting and recreating an account.
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email           text PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unsubscribed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- ── Reusable templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  subject     text NOT NULL DEFAULT '',
  body_md     text NOT NULL DEFAULT '',
  preheader   text NOT NULL DEFAULT '',
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Campaigns ────────────────────────────────────────────────────────────────
-- `segment` shape (see lib/marketing.ts):
--   { mode: 'audience' | 'manual',
--     universities: text[], verification: text, activity: text, emails: text[] }
CREATE TABLE IF NOT EXISTS email_campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  subject           text NOT NULL DEFAULT '',
  body_md           text NOT NULL DEFAULT '',
  preheader         text NOT NULL DEFAULT '',
  segment           jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'draft',
  scheduled_at      timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  total_recipients  integer NOT NULL DEFAULT 0,
  sent_count        integer NOT NULL DEFAULT 0,
  failed_count      integer NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_status_check;
ALTER TABLE email_campaigns
  ADD CONSTRAINT email_campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled'));

CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON email_campaigns (status, scheduled_at);

-- ── Per-recipient delivery rows ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text NOT NULL,
  full_name    text,
  status       text NOT NULL DEFAULT 'pending',
  error        text,
  claimed_at   timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

ALTER TABLE email_campaign_recipients DROP CONSTRAINT IF EXISTS email_campaign_recipients_status_check;
ALTER TABLE email_campaign_recipients
  ADD CONSTRAINT email_campaign_recipients_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'failed'));

CREATE INDEX IF NOT EXISTS email_campaign_recipients_campaign_idx
  ON email_campaign_recipients (campaign_id, status);

-- RLS on, no policies: these tables are reachable only through the service-role
-- client used by the admin server actions and the cron drain route.
ALTER TABLE email_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients  ENABLE ROW LEVEL SECURITY;

-- ── Audience resolution ──────────────────────────────────────────────────────
-- Emails live in auth.users, so segment resolution has to happen in SQL.
-- SECURITY DEFINER + revoked EXECUTE keeps it service-role only.
CREATE OR REPLACE FUNCTION marketing_audience(
  p_universities  text[] DEFAULT NULL,
  p_verification  text   DEFAULT 'any',
  p_activity      text   DEFAULT 'any'
)
RETURNS TABLE (user_id uuid, email text, full_name text, university text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, u.email::text, p.full_name, p.university
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(p.marketing_opt_in, TRUE) = TRUE
    AND u.email IS NOT NULL
    AND u.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM email_unsubscribes s WHERE lower(s.email) = lower(u.email::text)
    )
    AND (
      p_universities IS NULL
      OR array_length(p_universities, 1) IS NULL
      OR p.university = ANY (p_universities)
    )
    AND (
      p_verification = 'any'
      OR (p_verification = 'verified'
          AND p.school_id_status = 'approved'
          AND COALESCE(p.nin_verified, FALSE))
      OR (p_verification = 'school_id_approved' AND p.school_id_status = 'approved')
      OR (p_verification = 'nin_verified' AND COALESCE(p.nin_verified, FALSE))
      OR (p_verification = 'unverified'
          AND (p.school_id_status IS DISTINCT FROM 'approved'
               OR COALESCE(p.nin_verified, FALSE) = FALSE))
    )
    AND (
      p_activity = 'any'
      OR (p_activity = 'sellers'
          AND EXISTS (SELECT 1 FROM products pr WHERE pr.seller_id = p.id))
      OR (p_activity = 'buyers'
          AND EXISTS (SELECT 1 FROM orders o WHERE o.buyer_id = p.id))
      OR (p_activity = 'dormant'
          AND NOT EXISTS (SELECT 1 FROM products pr WHERE pr.seller_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.buyer_id = p.id))
    );
$$;

REVOKE ALL ON FUNCTION marketing_audience(text[], text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION marketing_audience(text[], text, text) TO service_role;

-- Maps an address back to an account so an unsubscribe can also flip the
-- profile flag. Returns NULL for addresses that only exist in a manual list.
CREATE OR REPLACE FUNCTION user_id_for_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email::text) = lower(p_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION user_id_for_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION user_id_for_email(text) TO service_role;

-- ── Batch claiming ───────────────────────────────────────────────────────────
-- Flips up to p_limit pending recipients to 'sending' and returns them, so
-- overlapping cron runs never send the same email twice.
CREATE OR REPLACE FUNCTION claim_campaign_recipients(p_campaign_id uuid, p_limit integer)
RETURNS TABLE (id uuid, email text, full_name text, user_id uuid)
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
  RETURNING r.id, r.email, r.full_name, r.user_id;
$$;

REVOKE ALL ON FUNCTION claim_campaign_recipients(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_campaign_recipients(uuid, integer) TO service_role;

-- If a send crashes between claiming a batch and recording the result, those
-- rows would sit in 'sending' forever and the campaign would look finished with
-- people never emailed. Anything claimed longer ago than p_stale_minutes goes
-- back in the queue. A batch takes seconds, so 15 minutes is far past any
-- legitimate in-flight window.
CREATE OR REPLACE FUNCTION requeue_stale_recipients(p_stale_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH requeued AS (
    UPDATE email_campaign_recipients
    SET status = 'pending', claimed_at = NULL
    WHERE status = 'sending'
      AND claimed_at < now() - make_interval(mins => p_stale_minutes)
    RETURNING 1
  )
  SELECT count(*)::integer FROM requeued;
$$;

REVOKE ALL ON FUNCTION requeue_stale_recipients(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION requeue_stale_recipients(integer) TO service_role;
