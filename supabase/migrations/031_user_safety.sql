-- User safety: blocking, reporting, moderation, and suspension.
--
-- App Store Review Guideline 1.2 requires every app whose primary content is
-- user-generated to ship four things: a filter that keeps objectionable
-- material from being posted, a way to report content, a way to block abusive
-- users, and published contact details. KolejSwap has the last one (/support)
-- and none of the first three. This migration is the foundation for all of
-- them.
--
-- Everything is enforced in Postgres rather than in application code. The web
-- app uses RLS-scoped server actions and the Flutter app talks to PostgREST
-- directly (see mobile/lib/features/chat/data/chat_repository.dart), so a
-- rule written in either client is a rule the other client does not have.
-- 017_products_kyc_gate.sql made the same call for the KYC listing gate.

-- ── Suspension ───────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- 015_launch_hardening.sql revoked the table-wide SELECT on profiles and
-- re-granted a column list, so the three columns above are invisible to
-- clients until named here. Suspension is not a secret — the UI needs it to
-- explain why a seller's listings vanished — but the reason is moderator
-- shorthand, so only the flag itself is exposed.
GRANT SELECT (is_suspended) ON profiles TO anon, authenticated;

-- Suspension is set by moderators through the service role only; nothing in
-- the column grants from 015 lets a user write it to themselves.

-- ── Blocking ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT blocked_users_no_self_block CHECK (blocker_id <> blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON blocked_users;
DROP POLICY IF EXISTS "Users can block others" ON blocked_users;
DROP POLICY IF EXISTS "Users can unblock others" ON blocked_users;

-- Deliberately one-sided: you can see who you blocked, never who blocked you.
CREATE POLICY "Users can view their own blocks" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;

CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_id);

-- Directional: did A block B? Has to be SECURITY DEFINER for the same reason
-- is_school_id_approved() does in 022 — policy expressions run with the
-- caller's privileges, and the SELECT policy above only exposes rows where the
-- caller is the blocker, so a plain subquery in a policy would silently never
-- see the block placed against the caller.
CREATE OR REPLACE FUNCTION has_blocked(p_blocker UUID, p_blocked UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = p_blocker AND blocked_id = p_blocked
  );
$$;

REVOKE ALL ON FUNCTION has_blocked(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_blocked(UUID, UUID) TO anon, authenticated;

-- Symmetric: is there a block in either direction? Delivery uses this one.
-- If a block only stopped the blocker's own messages, blocking your harasser
-- would silence you and leave them talking.
CREATE OR REPLACE FUNCTION is_blocked_between(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT has_blocked(p_a, p_b) OR has_blocked(p_b, p_a);
$$;

REVOKE ALL ON FUNCTION is_blocked_between(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_blocked_between(UUID, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION is_user_suspended(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM profiles WHERE id = p_user_id),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION is_user_suspended(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_user_suspended(UUID) TO anon, authenticated;

-- Is either party in this conversation blocking the other? Wraps the
-- conversation lookup so the messages INSERT policy can ask the question
-- without a subquery that RLS would then re-filter.
CREATE OR REPLACE FUNCTION is_conversation_blocked(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation_id
      AND is_blocked_between(c.buyer_id, c.seller_id)
  );
$$;

REVOKE ALL ON FUNCTION is_conversation_blocked(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_conversation_blocked(UUID) TO authenticated;

-- ── Enforcement: blocking and suspension gate the chat ───────────────────────
-- Visibility is one-sided, delivery is two-sided — the same shape as every
-- mainstream messenger, and the shape a victim actually needs:
--
--   * The blocker stops seeing the thread. Blocking a harasser has to get
--     them out of your inbox, or it has not done anything for you.
--   * The blocked party keeps seeing the thread, and keeps seeing their own
--     messages in it. Making the conversation disappear on their side would
--     announce the block, which is exactly what makes retaliation likely.
--   * Neither side can send another message.
--
-- Rows are never deleted, so unblocking restores the thread intact.
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can view unblocked conversations" ON conversations;
CREATE POLICY "Participants can view conversations they have not blocked" ON conversations
  FOR SELECT USING (
    (auth.uid() = buyer_id OR auth.uid() = seller_id)
    -- One of these two is the caller, and no one can block themselves, so
    -- this asks only "did the caller block the other party?".
    AND NOT has_blocked(auth.uid(), buyer_id)
    AND NOT has_blocked(auth.uid(), seller_id)
  );

-- The messages SELECT policy (006_chat.sql) reaches through conversations,
-- and that subquery runs under the caller's privileges, so the policy above
-- hides the blocker's view of the messages too. No separate read rule needed.

DROP POLICY IF EXISTS "Buyers can create conversations" ON conversations;
DROP POLICY IF EXISTS "Unblocked buyers can create conversations" ON conversations;
CREATE POLICY "Unblocked buyers can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id
    AND NOT is_blocked_between(buyer_id, seller_id)
    AND NOT is_user_suspended(buyer_id)
  );

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Unblocked participants can send messages" ON messages;
CREATE POLICY "Unblocked participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND NOT is_user_suspended(auth.uid())
    -- Explicit, rather than inherited from the conversations SELECT policy:
    -- the blocked party can still see the conversation row, so the EXISTS
    -- below would still pass for them.
    AND NOT is_conversation_blocked(conversation_id)
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Reporting still works after a block: report_content() below is
-- SECURITY DEFINER and does its own participation check, so a thread the
-- blocker can no longer see can still be reported. The clients offer
-- "Block and report" as one action so the ordering never bites a user who
-- blocks first and wants to report second.

-- A suspended seller's listings come off the marketplace immediately. The
-- seller keeps seeing their own so the app can explain the suspension rather
-- than appearing to have eaten their inventory. Moderation and dispute
-- surfaces read through the service-role client, which bypasses RLS entirely,
-- so an open escrow order stays fully resolvable by an admin.
DROP POLICY IF EXISTS "Products are viewable by everyone." ON products;
DROP POLICY IF EXISTS "Products from active sellers are viewable." ON products;
CREATE POLICY "Products from active sellers are viewable." ON products
  FOR SELECT USING (
    auth.uid() = seller_id
    OR NOT is_user_suspended(seller_id)
  );

-- Suspension also has to stop new listings. 022 owns this policy; re-create it
-- with the extra condition rather than layering a second INSERT policy, since
-- multiple permissive policies on the same command are OR-ed and a second one
-- would widen access instead of narrowing it.
DROP POLICY IF EXISTS "Verified sellers can insert their own products." ON products;
CREATE POLICY "Verified sellers can insert their own products." ON products
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND is_school_id_approved(auth.uid())
    AND NOT is_user_suspended(auth.uid())
  );

-- Blocking does not hide listings at the RLS layer. Doing so would make a
-- product row vanish mid-escrow for a buyer who blocked the seller after
-- paying, which breaks the order page. Catalog surfaces filter blocked
-- sellers out in the query instead — lib/safety.ts on web, SafetyRepository
-- on mobile.

-- ── Reporting ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- NULL reporter means the moderation filter raised this itself.
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'user', 'product', 'review')),
  target_id UUID NOT NULL,
  -- Denormalised at report time: who is answerable for the content. Keeps the
  -- moderation queue workable after the message or listing itself is deleted.
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'harassment',      -- threats, bullying, abusive language
    'sexual_content',  -- nudity, sexual solicitation
    'violence',        -- graphic violence, threats of harm
    'hate_speech',     -- slurs, targeted hate
    'scam',            -- fraud, off-platform payment bait
    'spam',            -- advertising, repetitive junk
    'prohibited_item', -- weapons, drugs, stolen goods (terms §5)
    'impersonation',
    'other'
  )),
  details TEXT,
  -- Snapshot of the reported text/image at report time, so a moderator can
  -- still judge the case after the author edits or deletes the original.
  evidence_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters can view their own reports" ON content_reports;
CREATE POLICY "Reporters can view their own reports" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Reports are filed through report_content() below, never by direct INSERT —
-- the function is what validates the target and stamps reported_user_id.
GRANT SELECT ON content_reports TO authenticated;

CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_reported_user_idx
  ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS content_reports_target_idx
  ON content_reports(target_type, target_id);

-- One open report per reporter per target. A second report while the first is
-- still open is almost always an impatient double-tap, and it would bury the
-- queue the moderator has to work through within 24 hours.
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_one_open_per_reporter_idx
  ON content_reports(reporter_id, target_type, target_id)
  WHERE status IN ('open', 'reviewing');

-- Files a report. Resolves who is answerable for the target, snapshots the
-- evidence, and refuses targets the caller cannot see — without that last
-- check the RPC would confirm whether any given UUID exists.
CREATE OR REPLACE FUNCTION report_content(
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id UUID := auth.uid();
  v_reported_user_id UUID;
  v_snapshot TEXT;
  v_recent_count INTEGER;
  v_report_id UUID;
BEGIN
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_details IS NOT NULL AND LENGTH(p_details) > 2000 THEN
    RAISE EXCEPTION 'DETAILS_TOO_LONG';
  END IF;

  -- Rate limit: reporting is the one write an abusive user can aim at the
  -- moderation queue itself.
  SELECT COUNT(*) INTO v_recent_count
  FROM content_reports
  WHERE reporter_id = v_reporter_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'REPORT_RATE_LIMIT';
  END IF;

  IF p_target_type = 'message' THEN
    SELECT m.sender_id,
           COALESCE(NULLIF(TRIM(m.content), ''), '[image]') ||
             CASE WHEN m.image_url IS NOT NULL THEN ' [image: ' || m.image_url || ']' ELSE '' END
    INTO v_reported_user_id, v_snapshot
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = p_target_id
      AND (c.buyer_id = v_reporter_id OR c.seller_id = v_reporter_id);

  ELSIF p_target_type = 'product' THEN
    SELECT p.seller_id, p.title || ' — ' || LEFT(COALESCE(p.description, ''), 500)
    INTO v_reported_user_id, v_snapshot
    FROM products p
    WHERE p.id = p_target_id;

  ELSIF p_target_type = 'review' THEN
    SELECT r.reviewer_id, LEFT(COALESCE(r.comment, ''), 500)
    INTO v_reported_user_id, v_snapshot
    FROM reviews r
    WHERE r.id = p_target_id;

  ELSIF p_target_type = 'user' THEN
    SELECT pr.id, pr.full_name
    INTO v_reported_user_id, v_snapshot
    FROM profiles pr
    WHERE pr.id = p_target_id;

  ELSE
    RAISE EXCEPTION 'INVALID_TARGET_TYPE';
  END IF;

  IF v_reported_user_id IS NULL THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;

  IF v_reported_user_id = v_reporter_id THEN
    RAISE EXCEPTION 'CANNOT_REPORT_SELF';
  END IF;

  INSERT INTO content_reports (
    reporter_id, target_type, target_id, reported_user_id,
    reason, details, evidence_snapshot
  )
  VALUES (
    v_reporter_id, p_target_type, p_target_id, v_reported_user_id,
    p_reason, NULLIF(TRIM(COALESCE(p_details, '')), ''), v_snapshot
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REPORTED';
END;
$$;

REVOKE ALL ON FUNCTION report_content(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION report_content(TEXT, UUID, TEXT, TEXT) TO authenticated;

-- ── Proactive moderation filter ──────────────────────────────────────────────
-- Guideline 1.2's first requirement is filtering objectionable material *from
-- being posted*, which a report queue alone does not satisfy. Terms live in a
-- table rather than in the function body so moderators can tune the list from
-- /admin/moderation without shipping a migration.
CREATE TABLE IF NOT EXISTS moderation_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL UNIQUE,
  -- Maps onto content_reports.reason so a flagged message files a report that
  -- looks like any other.
  category TEXT NOT NULL CHECK (category IN (
    'harassment', 'sexual_content', 'violence', 'hate_speech',
    'scam', 'spam', 'prohibited_item', 'impersonation', 'other'
  )),
  -- 'block' refuses the message outright; 'flag' lets it through and files a
  -- report. Anything with a plausible innocent reading must be 'flag' — this
  -- is a marketplace where people sell nude-coloured shoes.
  action TEXT NOT NULL CHECK (action IN ('block', 'flag')),
  -- TRUE matches against the de-obfuscated text (punctuation stripped,
  -- leetspeak folded), so patterns must be single runs of [a-z0-9] with no
  -- spaces. FALSE matches the raw lowercased message, for patterns that need
  -- word boundaries or punctuation.
  match_normalized BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on with no policies and no grants: the term list is moderator-only.
-- Publishing it would just be a guide to evading it.
ALTER TABLE moderation_terms ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS moderation_terms_active_idx
  ON moderation_terms(action) WHERE is_active;

-- Folds the tricks people use to slip a word past a substring match:
-- "f.u.c.k", "sh1t", "n_i_g", "@ss". Patterns matched against the result
-- therefore never contain spaces or punctuation.
CREATE OR REPLACE FUNCTION normalize_for_moderation(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT REGEXP_REPLACE(
    TRANSLATE(LOWER(COALESCE(p_text, '')), '0134578@$!', 'oieastbasi'),
    '[^a-z0-9]', '', 'g'
  );
$$;

-- Only the SECURITY DEFINER filter functions need this, and they run as the
-- owner. Leaving it callable would hand anyone a way to probe exactly how the
-- filter de-obfuscates text.
REVOKE ALL ON FUNCTION normalize_for_moderation(TEXT) FROM PUBLIC;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS flagged_category TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- 006_chat.sql never narrowed the INSERT grant on messages, so a client could
-- set any column it liked — including the four above, or a back-dated
-- created_at, or a pre-stamped read_at. Narrow it the way 029 narrowed UPDATE
-- and 015 narrowed products.
REVOKE INSERT ON messages FROM anon, authenticated;
GRANT INSERT (conversation_id, sender_id, content, image_url) ON messages TO authenticated;

-- An invalid regex in moderation_terms would make the BEFORE INSERT trigger
-- below throw on every message, taking chat down marketplace-wide. Two
-- defences: this one refuses the bad pattern at write time, and the trigger
-- itself skips a pattern that fails at match time.
CREATE OR REPLACE FUNCTION validate_moderation_pattern(p_pattern TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  PERFORM 'probe string' ~ p_pattern;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'INVALID_PATTERN';
END;
$$;

REVOKE ALL ON FUNCTION validate_moderation_pattern(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_moderation_pattern(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION check_moderation_term_pattern()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM validate_moderation_pattern(NEW.pattern);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_moderation_term ON moderation_terms;
CREATE TRIGGER validate_moderation_term
  BEFORE INSERT OR UPDATE OF pattern ON moderation_terms
  FOR EACH ROW EXECUTE FUNCTION check_moderation_term_pattern();

CREATE OR REPLACE FUNCTION moderate_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT;
  v_normalized TEXT;
  v_term RECORD;
  v_matched BOOLEAN;
BEGIN
  -- Never inherited from the client, whatever the grants say.
  NEW.flagged_at := NULL;
  NEW.flagged_category := NULL;
  NEW.hidden_at := NULL;
  NEW.hidden_reason := NULL;

  IF NULLIF(TRIM(COALESCE(NEW.content, '')), '') IS NULL THEN
    RETURN NEW;
  END IF;

  v_raw := LOWER(NEW.content);
  v_normalized := normalize_for_moderation(NEW.content);

  -- 'block' first: a message matching both a block and a flag term is
  -- refused, not merely reported.
  FOR v_term IN
    SELECT pattern, category, action, match_normalized
    FROM moderation_terms
    WHERE is_active
    ORDER BY CASE action WHEN 'block' THEN 0 ELSE 1 END
  LOOP
    BEGIN
      v_matched := (CASE WHEN v_term.match_normalized THEN v_normalized ELSE v_raw END)
                   ~ v_term.pattern;
    EXCEPTION
      -- A pattern that somehow got past validate_moderation_term must not be
      -- allowed to stop the whole marketplace from sending messages.
      WHEN OTHERS THEN
        RAISE WARNING 'moderation: skipping invalid pattern %', v_term.pattern;
        CONTINUE;
    END;

    IF v_matched THEN
      IF v_term.action = 'block' THEN
        RAISE EXCEPTION 'MESSAGE_BLOCKED_%', UPPER(v_term.category);
      END IF;

      NEW.flagged_at := NOW();
      NEW.flagged_category := v_term.category;
      RETURN NEW;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS moderate_message_before_insert ON messages;
CREATE TRIGGER moderate_message_before_insert
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION moderate_message_content();

-- A flagged message reaches the recipient but lands in the moderation queue
-- at the same time, as a report with no reporter.
CREATE OR REPLACE FUNCTION file_auto_moderation_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO content_reports (
    reporter_id, target_type, target_id, reported_user_id,
    reason, details, evidence_snapshot
  )
  VALUES (
    NULL, 'message', NEW.id, NEW.sender_id,
    NEW.flagged_category,
    'Raised automatically by the message filter.',
    LEFT(COALESCE(NEW.content, ''), 1000)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flag_message_after_insert ON messages;
CREATE TRIGGER flag_message_after_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.flagged_at IS NOT NULL)
  EXECUTE FUNCTION file_auto_moderation_report();

-- Starter term list. Two matching modes, chosen per pattern:
--
--   match_normalized = TRUE   multi-word phrases where evasion matters more
--                             than precision ("s3nd m3 nud3s" folds to
--                             "sendmenudes").
--   match_normalized = FALSE  short words, matched with \y word boundaries
--                             against the raw text. Normalising strips spaces,
--                             which would make a four-letter pattern match
--                             across a word break — "spic" inside "spicy", or
--                             worse, across "...this pic".
--
-- This list is a floor, not a finished policy. It is English-only and the user
-- base is Nigerian; moderators should extend it from /admin/moderation as they
-- see what actually turns up in the queue.
INSERT INTO moderation_terms (pattern, category, action, match_normalized, note) VALUES
  -- Sexual solicitation. Note that bare "nude" is deliberately absent: this is
  -- a marketplace where people sell nude-coloured clothing.
  ('send(ing|me|us)?(your|ur|the)?(nudes|nudepics|nudephotos)',  'sexual_content',  'block', TRUE,  'Solicitation of sexual images'),
  ('(dick|nude|naked)(pic|pics|photo|photos)',                   'sexual_content',  'block', TRUE,  'Solicitation or sending of sexual images'),
  ('sexfor(cash|money|grades|marks|rent)',                       'sexual_content',  'block', TRUE,  'Transactional sex'),
  ('sugar(daddy|mummy|mommy)',                                   'sexual_content',  'flag',  TRUE,  'Often a joke, sometimes solicitation'),
  ('\y(escort|hookup)s?\y',                                      'sexual_content',  'flag',  FALSE, 'Context-dependent'),

  -- Hate speech. Short and unambiguous, so matched on word boundaries: \y
  -- stops "spic" matching inside "spicy" the way a normalised match would.
  ('\yn[i1]gg(a|er|as|ers)\y',                                   'hate_speech',     'block', FALSE, NULL),
  ('\yfagg?(ot|ots)\y',                                          'hate_speech',     'block', FALSE, NULL),
  ('\y(tranny|trannies)\y',                                      'hate_speech',     'block', FALSE, NULL),
  ('\y(kike|chink|spic|coon)s?\y',                               'hate_speech',     'block', FALSE, NULL),
  ('\yretard(ed|s)?\y',                                          'hate_speech',     'flag',  FALSE, 'Casual usage is common; review rather than refuse'),

  -- Threats and violence. Normalisation strips spaces, so these patterns run
  -- the words together on purpose.
  ('iwill(kill|stab|shoot|beat|dealwith)you',                    'violence',        'block', TRUE,  'Explicit threat'),
  ('(iknowwhereyoulive|watchyourback|youaredead)',               'violence',        'block', TRUE,  'Explicit threat'),
  ('\y(kidnap|cultist|cult ?boys)\y',                            'violence',        'flag',  FALSE, 'Campus threat vocabulary'),

  -- Scams. The highest-volume real risk here: talking a buyer out of escrow is
  -- how almost every fraud on this marketplace starts.
  ('(pay|send)(me|it|themoney)?(directly|outside|offapp|offplatform)', 'scam',      'flag',  TRUE,  'Off-escrow payment bait'),
  ('(sendto|payinto|transferto)my(account|bank|number|momo)',     'scam',           'flag',  TRUE,  'Off-escrow payment bait'),
  ('(dont|donot|noneedto)use(theapp|escrow|unitrade|kolejswap)',  'scam',           'flag',  TRUE,  'Off-escrow payment bait'),
  -- Bare "pin" is an ordinary word here ("pin the meetup location"), so only
  -- the credential senses are worth a moderator's attention.
  ('\y(bvn|otp|cvv|(atm|card|transfer) ?pin)\y',                 'scam',            'flag',  FALSE, 'Credential harvesting'),
  ('\y(gift ?card|bitcoin|usdt|crypto)\y',                       'scam',            'flag',  FALSE, 'Common scam payment rails'),

  -- Prohibited items (terms of service section 5). "loud" and "molly" are
  -- deliberately absent: an ordinary adjective and an ordinary name are not
  -- worth the false positives their street senses would cost.
  ('\y(tramadol|codeine|rohypnol|mkush|igbo ?weed)\y',           'prohibited_item', 'flag',  FALSE, 'Controlled substances'),
  ('\y(exam ?runz|expo ?runz|project ?writing)\y',               'prohibited_item', 'flag',  FALSE, 'Academic fraud'),
  ('\y(gun|pistol|ammo|ammunition)s?\y',                         'prohibited_item', 'flag',  FALSE, 'Weapons')
ON CONFLICT (pattern) DO NOTHING;

-- Lets a moderator try a phrase against the live filter before they add a
-- pattern that would refuse half the marketplace's messages. Deliberately
-- shares the matching logic's shape with moderate_message_content() above —
-- if the two ever drift, the preview stops being worth anything.
CREATE OR REPLACE FUNCTION test_moderation(p_text TEXT)
RETURNS TABLE (matched_pattern TEXT, matched_category TEXT, matched_action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT;
  v_normalized TEXT;
  v_term RECORD;
  v_matched BOOLEAN;
BEGIN
  v_raw := LOWER(COALESCE(p_text, ''));
  v_normalized := normalize_for_moderation(p_text);

  FOR v_term IN
    SELECT t.pattern, t.category, t.action, t.match_normalized
    FROM moderation_terms t
    WHERE t.is_active
    ORDER BY CASE t.action WHEN 'block' THEN 0 ELSE 1 END
  LOOP
    BEGIN
      v_matched := (CASE WHEN v_term.match_normalized THEN v_normalized ELSE v_raw END)
                   ~ v_term.pattern;
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;

    IF v_matched THEN
      matched_pattern  := v_term.pattern;
      matched_category := v_term.category;
      matched_action   := v_term.action;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION test_moderation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION test_moderation(TEXT) TO service_role;

-- ── Moderator takedowns ──────────────────────────────────────────────────────
-- Removed content is kept here rather than in messages, so the messages table
-- can keep its table-wide SELECT grant. Moving it the other way — a
-- hidden_content column on messages — would mean revoking SELECT on messages
-- and re-granting a column list, and the mobile client's .stream() issues a
-- SELECT * that would start failing the moment one column was held back.
CREATE TABLE IF NOT EXISTS moderation_removals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'product', 'review')),
  target_id UUID NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  original_content TEXT,
  original_image_url TEXT,
  reason TEXT,
  removed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderator-only, same as moderation_terms: RLS on, no policies, no grants.
ALTER TABLE moderation_removals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS moderation_removals_target_idx
  ON moderation_removals(target_type, target_id);

-- Takes a message down in one statement: the original is preserved for the
-- audit trail and the bubble becomes a tombstone. Doing this as two writes
-- from the server action would leave a window where the row is logged but
-- still readable.
CREATE OR REPLACE FUNCTION admin_hide_message(
  p_message_id UUID,
  p_reason TEXT,
  p_moderator_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message RECORD;
BEGIN
  SELECT id, sender_id, content, image_url, hidden_at
  INTO v_message
  FROM messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MESSAGE_NOT_FOUND';
  END IF;

  IF v_message.hidden_at IS NOT NULL THEN
    RETURN FALSE;  -- already taken down, nothing to preserve
  END IF;

  INSERT INTO moderation_removals (
    target_type, target_id, author_id,
    original_content, original_image_url, reason, removed_by
  )
  VALUES (
    'message', v_message.id, v_message.sender_id,
    v_message.content, v_message.image_url, p_reason, p_moderator_id
  );

  UPDATE messages
  SET content = 'This message was removed by a moderator.',
      image_url = NULL,
      hidden_at = NOW(),
      hidden_reason = p_reason
  WHERE id = p_message_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION admin_hide_message(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_hide_message(UUID, TEXT, UUID) TO service_role;

-- Suspension flips a single flag; the products SELECT policy and the messages
-- INSERT policy above do the rest. Kept as an RPC so the timestamp, the
-- reason, and the flag can never drift apart.
CREATE OR REPLACE FUNCTION admin_set_suspension(
  p_user_id UUID,
  p_suspended BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET is_suspended = p_suspended,
      suspended_at = CASE WHEN p_suspended THEN NOW() ELSE NULL END,
      suspension_reason = CASE WHEN p_suspended THEN p_reason ELSE NULL END
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_suspension(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_suspension(UUID, BOOLEAN, TEXT) TO service_role;
