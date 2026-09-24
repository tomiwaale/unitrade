-- Price negotiation ("make an offer").
--
-- Listings carry one asking price, but haggling is how this market actually
-- clears — buyers were already typing "would you take 18k?" into chat and then
-- had no way to hold the seller to the answer, because
-- reserve_product_for_checkout (015_launch_hardening.sql) always charged
-- products.price.
--
-- Shape of the feature:
--   * A buyer names a price. The seller accepts, declines, or counters. The
--     buyer can accept a counter. One live offer per (listing, buyer) at a
--     time, so a negotiation is a single chain rather than a pile.
--   * Every event in that chain posts a message into the existing
--     conversation, which is what carries it to the other side: chat realtime,
--     the notification row, push, and the unread badge all already hang off
--     messages and need no new plumbing. The text of that message is also why
--     a mobile binary built before this migration still shows something
--     sensible in the thread.
--   * An accepted offer is what checkout charges. That is enforced in
--     reserve_product_for_checkout below and never passed in by a client —
--     otherwise naming your own price would be a matter of editing a request.
--
-- Every write goes through a SECURITY DEFINER function here. price_offers is
-- SELECT-only for authenticated, the same way orders are: these rows set the
-- amount money moves at, so the state machine lives in one place that can also
-- take its locks.

-- ── Naira formatting ────────────────────────────────────────────────────────
-- The offer messages below are read by humans, so they carry a formatted
-- amount rather than a bare numeric. Kobo only appears when it is non-zero;
-- campus prices are whole naira.
CREATE OR REPLACE FUNCTION format_naira(p_amount NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT '₦' || CASE
    WHEN p_amount = TRUNC(p_amount)
      THEN TRIM(TO_CHAR(p_amount, 'FM999,999,999,990'))
    ELSE TRIM(TO_CHAR(p_amount, 'FM999,999,999,990.00'))
  END;
$$;

REVOKE ALL ON FUNCTION format_naira(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION format_naira(NUMERIC) TO anon, authenticated, service_role;

-- ── Seller opt-out ──────────────────────────────────────────────────────────
-- Default TRUE: the whole point is that haggling is the norm here, and
-- existing listings should not all have to be re-saved to join in. A seller
-- who wants their price treated as firm turns it off per listing.
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_offers BOOLEAN NOT NULL DEFAULT TRUE;

-- INSERT/UPDATE on products is granted column by column
-- (015_launch_hardening.sql, extended by 016_mobile_support.sql), so a new
-- column is invisible to writers until it is named here.
GRANT INSERT (
  seller_id, title, description, price, images, category, condition,
  open_to, location, listing_type, latitude, longitude, allow_offers
) ON products TO authenticated;
GRANT UPDATE (
  title, description, price, images, category, condition, open_to,
  location, listing_type, latitude, longitude, updated_at, allow_offers
) ON products TO authenticated;

-- ── Offers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  -- Where the negotiation is visible. Kept nullable so deleting a thread
  -- never destroys the record of a price two people agreed on.
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Which side put this number on the table. A counter-offer is a row with
  -- offered_by = seller_id, which is what makes "who may accept this?"
  -- answerable from the row alone.
  offered_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'countered', 'withdrawn', 'expired')),
  -- The offer this one answers, so the chain can be walked for history.
  counters_id UUID REFERENCES price_offers(id) ON DELETE SET NULL,
  -- A price nobody answers should not bind the seller forever. Re-stamped on
  -- acceptance to give the buyer a fresh window to actually pay.
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  -- Set when an accepted offer is spent on a checkout, which is both the
  -- record of what was charged and the guard against spending it twice.
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT price_offers_distinct_parties CHECK (buyer_id <> seller_id),
  CONSTRAINT price_offers_offered_by_participant
    CHECK (offered_by = buyer_id OR offered_by = seller_id)
);

-- One live offer per (listing, buyer): a negotiation is a chain, and
-- countering closes the offer it answers in the same transaction as it opens
-- the next one.
CREATE UNIQUE INDEX IF NOT EXISTS price_offers_one_pending_idx
  ON price_offers(product_id, buyer_id)
  WHERE status = 'pending';

-- And one *spendable* accepted offer, which is what lets checkout resolve the
-- agreed price without a tie-break. An accepted offer that has been spent
-- keeps its row (order_id set) as the record of the deal.
CREATE UNIQUE INDEX IF NOT EXISTS price_offers_one_live_accepted_idx
  ON price_offers(product_id, buyer_id)
  WHERE status = 'accepted' AND order_id IS NULL;

CREATE INDEX IF NOT EXISTS price_offers_conversation_idx
  ON price_offers(conversation_id);
CREATE INDEX IF NOT EXISTS price_offers_seller_status_idx
  ON price_offers(seller_id, status);
CREATE INDEX IF NOT EXISTS price_offers_buyer_status_idx
  ON price_offers(buyer_id, status);
-- Backs the per-actor throttle in place_price_offer().
CREATE INDEX IF NOT EXISTS price_offers_actor_recent_idx
  ON price_offers(offered_by, created_at DESC);
-- expire_stale_offers() sweeps on this.
CREATE INDEX IF NOT EXISTS price_offers_live_expiry_idx
  ON price_offers(expires_at)
  WHERE status IN ('pending', 'accepted');

ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view price offers" ON price_offers;
CREATE POLICY "Participants can view price offers"
  ON price_offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Read-only to clients. Everything else goes through the functions below.
REVOKE ALL ON price_offers FROM anon, authenticated;
GRANT SELECT ON price_offers TO authenticated;

-- ── Offer events in the thread ──────────────────────────────────────────────
-- An offer renders as a card in chat rather than as a line of text. offer_id
-- says which offer, offer_event says what happened to it — the card needs the
-- event because a single offer produces several bubbles (made → accepted), and
-- it reads the live price_offers row for the amount and for whether the
-- accept/decline buttons still apply.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS offer_id UUID
  REFERENCES price_offers(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS offer_event TEXT
  CHECK (offer_event IN ('offered', 'countered', 'accepted', 'declined', 'withdrawn'));

CREATE INDEX IF NOT EXISTS messages_offer_idx ON messages(offer_id)
  WHERE offer_id IS NOT NULL;

-- offer_id/offer_event are deliberately NOT added to the authenticated INSERT
-- grant (031_user_safety.sql narrowed it to conversation_id/sender_id/content/
-- image_url): only the SECURITY DEFINER functions below may stamp a message as
-- an offer event. Otherwise anyone could post a bubble claiming a price had
-- been agreed.

-- ── Expiry sweep ────────────────────────────────────────────────────────────
-- Called at the top of every offer function and of checkout, the same way
-- expire_checkout_reservations() is — there is no cron in front of this, so it
-- has to be lazy to be reliable.
CREATE OR REPLACE FUNCTION expire_stale_offers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired INTEGER;
BEGIN
  UPDATE price_offers po
  SET status = 'expired', updated_at = NOW()
  WHERE po.status IN ('pending', 'accepted')
    -- An offer already spent on an order is history, not a live promise.
    AND po.order_id IS NULL
    AND (
      po.expires_at <= NOW()
      -- Sold, drafted or pulled: there is nothing left to negotiate over, and
      -- leaving the offer live would strand it as permanently pending.
      OR NOT EXISTS (
        SELECT 1 FROM products p
        WHERE p.id = po.product_id AND p.status = 'active'
      )
    );

  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$;

REVOKE ALL ON FUNCTION expire_stale_offers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION expire_stale_offers() TO authenticated, service_role;

-- ── Posting an offer event into the conversation ─────────────────────────────
-- Shared by the two functions below. SECURITY DEFINER bypasses the messages
-- RLS policy and the narrowed column grant, which is the point; the moderation
-- BEFORE INSERT trigger (031_user_safety.sql) still runs, so a note that
-- breaks the content rules still takes the whole offer down with it.
CREATE OR REPLACE FUNCTION post_offer_message(
  p_offer_id UUID,
  p_event TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer price_offers;
  v_sender UUID;
  v_content TEXT;
BEGIN
  SELECT po.* INTO v_offer FROM price_offers po WHERE po.id = p_offer_id;
  IF NOT FOUND OR v_offer.conversation_id IS NULL THEN
    RETURN;
  END IF;

  -- 'offered', 'countered' and 'withdrawn' come from whoever named the price;
  -- accepting or declining comes from the other side.
  v_sender := CASE
    WHEN p_event IN ('offered', 'countered', 'withdrawn') THEN v_offer.offered_by
    WHEN v_offer.offered_by = v_offer.buyer_id THEN v_offer.seller_id
    ELSE v_offer.buyer_id
  END;

  v_content := CASE p_event
    WHEN 'offered'   THEN 'Offered ' || format_naira(v_offer.amount)
    WHEN 'countered' THEN 'Countered with ' || format_naira(v_offer.amount)
    WHEN 'accepted'  THEN 'Accepted ' || format_naira(v_offer.amount)
    WHEN 'declined'  THEN 'Declined ' || format_naira(v_offer.amount)
    WHEN 'withdrawn' THEN 'Withdrew their ' || format_naira(v_offer.amount) || ' offer'
  END;

  -- The note rides in the message body so that it passes through content
  -- moderation like any other thing a user typed at another user.
  IF p_event IN ('offered', 'countered')
     AND NULLIF(TRIM(COALESCE(v_offer.note, '')), '') IS NOT NULL THEN
    v_content := v_content || E'\n' || TRIM(v_offer.note);
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, offer_id, offer_event)
  VALUES (v_offer.conversation_id, v_sender, v_content, p_offer_id, p_event);
END;
$$;

REVOKE ALL ON FUNCTION post_offer_message(UUID, TEXT) FROM PUBLIC;

-- ── Placing an offer (or a counter) ─────────────────────────────────────────
-- Returns the whole price_offers row. That is partly so the caller has the
-- conversation to navigate to, and partly to keep every column reference in
-- the body unambiguous: RETURNS TABLE(status ..., amount ...) would shadow the
-- columns of the same name and make `WHERE status = 'pending'` a runtime
-- error.
CREATE OR REPLACE FUNCTION place_price_offer(
  p_product_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL,
  p_counters_id UUID DEFAULT NULL
)
RETURNS price_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_product RECORD;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_conversation_id UUID;
  v_counter price_offers;
  v_offer price_offers;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Enforced here rather than in the web action's rateLimit() because the
  -- mobile app calls this RPC directly and would otherwise have no limiter in
  -- front of it. Generous enough that a real haggle never trips it.
  IF (
    SELECT COUNT(*) FROM price_offers po
    WHERE po.offered_by = v_actor
      AND po.created_at > NOW() - INTERVAL '1 minute'
  ) >= 15 THEN
    RAISE EXCEPTION 'OFFER_RATE_LIMITED';
  END IF;

  PERFORM expire_stale_offers();

  SELECT p.id, p.seller_id, p.price, p.status, p.allow_offers, p.open_to
  INTO v_product
  FROM products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
  IF v_product.status <> 'active' THEN
    RAISE EXCEPTION 'PRODUCT_NOT_AVAILABLE';
  END IF;
  IF NOT v_product.allow_offers THEN
    RAISE EXCEPTION 'OFFERS_NOT_ACCEPTED';
  END IF;
  -- A swap-only listing has no cash price to negotiate; that conversation is
  -- swap_offers' job (010_swap_offers.sql).
  IF v_product.open_to = 'swap-only' THEN
    RAISE EXCEPTION 'OFFERS_NOT_ACCEPTED';
  END IF;

  -- Fat-finger and overflow guard. amount is DECIMAL(10,2), and an offer an
  -- order of magnitude over asking is a typo, not a negotiation. Lowballs are
  -- deliberately allowed: declining one is the seller's call, not the
  -- database's.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF p_amount > LEAST(v_product.price * 10, 99999999) THEN
    RAISE EXCEPTION 'AMOUNT_TOO_HIGH';
  END IF;

  IF v_actor = v_product.seller_id THEN
    -- The seller is countering, so the offer they are answering is what
    -- identifies the buyer. A seller cannot open a negotiation out of nowhere.
    IF p_counters_id IS NULL THEN
      RAISE EXCEPTION 'COUNTER_REQUIRES_OFFER';
    END IF;
  ELSE
    v_buyer_id := v_actor;
    v_seller_id := v_product.seller_id;
  END IF;

  IF p_counters_id IS NOT NULL THEN
    SELECT po.* INTO v_counter
    FROM price_offers po
    WHERE po.id = p_counters_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'OFFER_NOT_FOUND';
    END IF;
    IF v_counter.product_id <> p_product_id THEN
      RAISE EXCEPTION 'OFFER_PRODUCT_MISMATCH';
    END IF;
    IF v_actor <> v_counter.buyer_id AND v_actor <> v_counter.seller_id THEN
      RAISE EXCEPTION 'NOT_A_PARTICIPANT';
    END IF;
    IF v_counter.status <> 'pending' THEN
      RAISE EXCEPTION 'OFFER_NOT_PENDING';
    END IF;
    -- Countering is answering the other side. Re-pricing your own live offer
    -- would be a withdraw-and-replace, and is refused so the chain cannot
    -- fork.
    IF v_counter.offered_by = v_actor THEN
      RAISE EXCEPTION 'CANNOT_COUNTER_OWN_OFFER';
    END IF;

    v_buyer_id := v_counter.buyer_id;
    v_seller_id := v_counter.seller_id;
    v_conversation_id := v_counter.conversation_id;

    UPDATE price_offers po
    SET status = 'countered', responded_at = NOW(), updated_at = NOW()
    WHERE po.id = p_counters_id;
  END IF;

  IF v_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'SELF_OFFER';
  END IF;

  -- RLS is not doing this for us inside SECURITY DEFINER, so the safety rules
  -- that gate a conversation (031_user_safety.sql) are applied by hand.
  IF is_blocked_between(v_buyer_id, v_seller_id) THEN
    RAISE EXCEPTION 'CONVERSATION_BLOCKED';
  END IF;
  IF is_user_suspended(v_actor) THEN
    RAISE EXCEPTION 'USER_SUSPENDED';
  END IF;

  -- A negotiation belongs in the thread about the listing; reuse the one the
  -- buyer already has, per the (product_id, buyer_id) key from 006_chat.sql.
  IF v_conversation_id IS NULL THEN
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE c.product_id = p_product_id AND c.buyer_id = v_buyer_id;

    IF v_conversation_id IS NULL THEN
      INSERT INTO conversations (product_id, buyer_id, seller_id)
      VALUES (p_product_id, v_buyer_id, v_seller_id)
      ON CONFLICT (product_id, buyer_id) DO NOTHING
      RETURNING id INTO v_conversation_id;

      IF v_conversation_id IS NULL THEN
        SELECT c.id INTO v_conversation_id
        FROM conversations c
        WHERE c.product_id = p_product_id AND c.buyer_id = v_buyer_id;
      END IF;
    END IF;
  END IF;

  -- Closes anything still standing for this pair, so the unique index holds
  -- and the thread has exactly one number open at a time. Making a fresh offer
  -- while the other side's counter is live declines that counter, which is
  -- what naming a different price means.
  UPDATE price_offers po
  SET status = CASE WHEN po.offered_by = v_actor THEN 'withdrawn' ELSE 'declined' END,
      responded_at = NOW(),
      updated_at = NOW()
  WHERE po.product_id = p_product_id
    AND po.buyer_id = v_buyer_id
    AND po.status = 'pending'
    AND (p_counters_id IS NULL OR po.id <> p_counters_id);

  INSERT INTO price_offers (
    product_id, conversation_id, buyer_id, seller_id, offered_by,
    amount, note, counters_id, expires_at
  )
  VALUES (
    p_product_id, v_conversation_id, v_buyer_id, v_seller_id, v_actor,
    ROUND(p_amount, 2), NULLIF(TRIM(COALESCE(p_note, '')), ''), p_counters_id,
    NOW() + INTERVAL '48 hours'
  )
  RETURNING * INTO v_offer;

  PERFORM post_offer_message(
    v_offer.id,
    CASE WHEN p_counters_id IS NULL THEN 'offered' ELSE 'countered' END
  );

  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION place_price_offer(UUID, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_price_offer(UUID, NUMERIC, TEXT, UUID) TO authenticated;

-- ── Responding to an offer ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION respond_to_price_offer(
  p_offer_id UUID,
  p_action TEXT
)
RETURNS price_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_offer price_offers;
  v_product_status TEXT;
  v_new_status TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_action NOT IN ('accept', 'decline', 'withdraw') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;

  PERFORM expire_stale_offers();

  SELECT po.* INTO v_offer FROM price_offers po WHERE po.id = p_offer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFER_NOT_FOUND';
  END IF;
  IF v_actor <> v_offer.buyer_id AND v_actor <> v_offer.seller_id THEN
    RAISE EXCEPTION 'NOT_A_PARTICIPANT';
  END IF;
  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'OFFER_NOT_PENDING';
  END IF;

  IF p_action = 'withdraw' THEN
    -- Only the side that named the price can take it back.
    IF v_offer.offered_by <> v_actor THEN
      RAISE EXCEPTION 'NOT_YOUR_OFFER';
    END IF;
    v_new_status := 'withdrawn';
  ELSE
    -- ...and only the other side can accept or decline it.
    IF v_offer.offered_by = v_actor THEN
      RAISE EXCEPTION 'CANNOT_RESPOND_TO_OWN_OFFER';
    END IF;
    v_new_status := CASE p_action WHEN 'accept' THEN 'accepted' ELSE 'declined' END;
  END IF;

  IF v_new_status = 'accepted' THEN
    SELECT p.status INTO v_product_status FROM products p WHERE p.id = v_offer.product_id;
    IF v_product_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'PRODUCT_NOT_AVAILABLE';
    END IF;
    IF is_blocked_between(v_offer.buyer_id, v_offer.seller_id) THEN
      RAISE EXCEPTION 'CONVERSATION_BLOCKED';
    END IF;
  END IF;

  UPDATE price_offers po
  SET status = v_new_status,
      responded_at = NOW(),
      updated_at = NOW(),
      -- An accepted price gets a fresh window, measured from the handshake
      -- rather than from whenever the offer happened to be made.
      expires_at = CASE WHEN v_new_status = 'accepted'
                        THEN NOW() + INTERVAL '48 hours'
                        ELSE po.expires_at END
  WHERE po.id = p_offer_id
  RETURNING po.* INTO v_offer;

  PERFORM post_offer_message(p_offer_id, CASE p_action
    WHEN 'accept'   THEN 'accepted'
    WHEN 'decline'  THEN 'declined'
    WHEN 'withdraw' THEN 'withdrawn'
  END);

  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION respond_to_price_offer(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION respond_to_price_offer(UUID, TEXT) TO authenticated;

-- ── Checkout at the agreed price ────────────────────────────────────────────
-- The whole feature turns on this function. 015_launch_hardening.sql charged
-- products.price unconditionally; it now resolves the buyer's live accepted
-- offer and charges that instead.
--
-- p_offer_id is optional, and when it is omitted the accepted offer is looked
-- up rather than trusted from the caller. Two reasons:
--   * Correctness. The amount is never client-supplied, so "buy this for ₦1"
--     is not a request anyone can make. The offer id, when passed, only
--     narrows the lookup — it still has to belong to the caller and be live.
--   * The mobile binaries already in students' hands call the two-argument
--     form. Resolving the offer server-side means a buyer who negotiated on
--     the web and taps Buy in an old build is still charged the agreed price
--     rather than the asking price.
--
-- Recreated rather than replaced because the signature gains an argument. The
-- new argument defaults, so existing two-argument callers keep resolving here.
DROP FUNCTION IF EXISTS reserve_product_for_checkout(UUID, TEXT);

CREATE OR REPLACE FUNCTION reserve_product_for_checkout(
  p_product_id UUID,
  p_reference TEXT,
  p_offer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  amount NUMERIC,
  seller_subaccount_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_product RECORD;
  v_order_id UUID;
  v_offer price_offers;
  v_amount NUMERIC;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_reference IS NULL OR LENGTH(TRIM(p_reference)) < 8 THEN
    RAISE EXCEPTION 'INVALID_REFERENCE';
  END IF;

  PERFORM expire_checkout_reservations();
  -- After the reservation sweep, which is what hands an abandoned checkout's
  -- offer back, and before the lookup below, so a price whose window has
  -- closed cannot be spent a minute later.
  PERFORM expire_stale_offers();

  SELECT
    p.id,
    p.price,
    p.seller_id,
    p.status,
    pr.subaccount_code
  INTO v_product
  FROM products p
  JOIN profiles pr ON pr.id = p.seller_id
  WHERE p.id = p_product_id
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  IF v_product.seller_id = v_buyer_id THEN
    RAISE EXCEPTION 'SELF_PURCHASE';
  END IF;

  IF v_product.status <> 'active' THEN
    RAISE EXCEPTION 'PRODUCT_NOT_AVAILABLE';
  END IF;

  IF v_product.subaccount_code IS NULL OR v_product.subaccount_code = '' THEN
    RAISE EXCEPTION 'SELLER_PAYOUT_REQUIRED';
  END IF;

  -- Offers are locked after products, matching the order the offer functions
  -- take, so two concurrent checkouts cannot deadlock against each other.
  IF p_offer_id IS NOT NULL THEN
    SELECT po.* INTO v_offer
    FROM price_offers po
    WHERE po.id = p_offer_id
      AND po.product_id = p_product_id
      AND po.buyer_id = v_buyer_id
      AND po.status = 'accepted'
      AND po.order_id IS NULL
      AND po.expires_at > NOW()
    FOR UPDATE;

    -- An offer id that does not resolve is a hard error rather than a silent
    -- fall back to asking price: the buyer believes they agreed on a number,
    -- and quietly charging them more is the one outcome worth failing over.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'OFFER_NOT_REDEEMABLE';
    END IF;
  ELSE
    SELECT po.* INTO v_offer
    FROM price_offers po
    WHERE po.product_id = p_product_id
      AND po.buyer_id = v_buyer_id
      AND po.status = 'accepted'
      AND po.order_id IS NULL
      AND po.expires_at > NOW()
    ORDER BY po.responded_at DESC NULLS LAST
    LIMIT 1
    FOR UPDATE;
  END IF;

  v_amount := COALESCE(v_offer.amount, v_product.price);

  IF EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.product_id = p_product_id
      AND o.status IN ('pending', 'paid', 'confirmed', 'disputed')
  ) THEN
    RAISE EXCEPTION 'PRODUCT_CHECKOUT_RESERVED';
  END IF;

  INSERT INTO orders (
    product_id,
    buyer_id,
    amount,
    paystack_reference,
    status,
    checkout_expires_at
  )
  VALUES (
    p_product_id,
    v_buyer_id,
    v_amount,
    p_reference,
    'pending',
    NOW() + INTERVAL '45 minutes'
  )
  RETURNING id INTO v_order_id;

  -- Spends the offer. Handed back if the reservation lapses — see below.
  IF v_offer.id IS NOT NULL THEN
    UPDATE price_offers po
    SET order_id = v_order_id, updated_at = NOW()
    WHERE po.id = v_offer.id;
  END IF;

  RETURN QUERY
  SELECT v_order_id, v_amount::NUMERIC, v_product.subaccount_code::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'PRODUCT_CHECKOUT_RESERVED';
END;
$$;

REVOKE ALL ON FUNCTION reserve_product_for_checkout(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_product_for_checkout(UUID, TEXT, UUID) TO authenticated;

-- ── Handing an agreed price back when a checkout lapses ─────────────────────
-- A buyer who agreed ₦18,000 and then abandoned the Paystack page should come
-- back to ₦18,000, not to the asking price. Both reservation-release paths
-- unspend the offer; whether it is still in date is then the expiry sweep's
-- call, rather than a side effect of having once clicked Buy.
--
-- Both keep their original return values (rows newly expired / whether
-- anything was released), which is why the count comes from the CTE and not
-- from a second count over the table.
CREATE OR REPLACE FUNCTION expire_checkout_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH lapsed AS (
    UPDATE orders o
    SET status = 'expired'
    WHERE o.status = 'pending'
      AND o.checkout_expires_at IS NOT NULL
      AND o.checkout_expires_at < NOW()
    RETURNING o.id
  ), unspent AS (
    UPDATE price_offers po
    SET order_id = NULL, updated_at = NOW()
    WHERE po.order_id IN (SELECT id FROM lapsed)
    RETURNING po.id
  )
  SELECT COUNT(*) INTO expired_count FROM lapsed;

  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION release_checkout_reservation(p_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  WITH released AS (
    UPDATE orders o
    SET status = 'expired'
    WHERE o.paystack_reference = p_reference
      AND o.status = 'pending'
    RETURNING o.id
  ), unspent AS (
    UPDATE price_offers po
    SET order_id = NULL, updated_at = NOW()
    WHERE po.order_id IN (SELECT id FROM released)
    RETURNING po.id
  )
  SELECT COUNT(*) INTO released_count FROM released;

  RETURN released_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION expire_checkout_reservations() FROM PUBLIC;
REVOKE ALL ON FUNCTION release_checkout_reservation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION release_checkout_reservation(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION expire_checkout_reservations() TO service_role;

-- ── Notification copy for offer events ──────────────────────────────────────
-- Offer events are messages, so they already notify and already push
-- (send-push fires on the notifications insert). What they need is copy that
-- says what happened, and a type of its own so "your offer was accepted" does
-- not arrive looking like any other chat message. related_id stays the
-- conversation: the thread is where the accept/decline buttons live, so that
-- is where a tap should land.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_seller_id UUID;
  v_product_title TEXT;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_is_opening_message BOOLEAN;
  v_preview TEXT;
  v_title TEXT;
  v_type TEXT := 'message';
  v_offer_amount NUMERIC;
BEGIN
  SELECT c.buyer_id, c.seller_id, p.title
  INTO v_buyer_id, v_seller_id, v_product_title
  FROM conversations c
  LEFT JOIN products p ON p.id = c.product_id
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_recipient_id := CASE
    WHEN NEW.sender_id = v_buyer_id THEN v_seller_id
    ELSE v_buyer_id
  END;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(TRIM(pr.full_name), '') INTO v_sender_name
  FROM profiles pr WHERE pr.id = NEW.sender_id;
  v_sender_name := COALESCE(v_sender_name, 'A student');

  SELECT NOT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = NEW.conversation_id AND m.id <> NEW.id
  ) INTO v_is_opening_message;

  v_preview := NULLIF(TRIM(COALESCE(NEW.content, '')), '');
  IF v_preview IS NULL AND NEW.image_url IS NOT NULL THEN
    v_preview := '📷 Photo';
  ELSIF LENGTH(v_preview) > 140 THEN
    v_preview := LEFT(v_preview, 139) || '…';
  END IF;

  IF NEW.offer_id IS NOT NULL THEN
    SELECT po.amount INTO v_offer_amount FROM price_offers po WHERE po.id = NEW.offer_id;
    v_type := 'offer';

    v_title := CASE NEW.offer_event
      WHEN 'offered'   THEN v_sender_name || ' offered ' || format_naira(v_offer_amount)
      WHEN 'countered' THEN v_sender_name || ' countered with ' || format_naira(v_offer_amount)
      WHEN 'accepted'  THEN 'Offer accepted — ' || format_naira(v_offer_amount)
      WHEN 'declined'  THEN v_sender_name || ' declined your offer'
      WHEN 'withdrawn' THEN v_sender_name || ' withdrew their offer'
      ELSE v_sender_name || ' updated their offer'
    END;

    -- The accepted case is the one with something to do next, so it says so
    -- rather than just naming the listing.
    IF NEW.offer_event = 'accepted' AND v_product_title IS NOT NULL THEN
      v_preview := 'Pay ' || format_naira(v_offer_amount) || ' for "' || v_product_title || '" to lock it in';
    ELSIF v_product_title IS NOT NULL THEN
      v_preview := 'For "' || v_product_title || '"';
    END IF;
  ELSIF v_is_opening_message AND NEW.sender_id = v_buyer_id AND v_product_title IS NOT NULL THEN
    v_title := v_sender_name || ' is interested in "' || v_product_title || '"';
  ELSIF v_product_title IS NOT NULL THEN
    v_title := v_sender_name || ' about "' || v_product_title || '"';
  ELSE
    v_title := 'New message from ' || v_sender_name;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, related_id)
  VALUES (v_recipient_id, v_type, v_title, v_preview, NEW.conversation_id);

  RETURN NEW;
END;
$$;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Both clients refetch offers when an offer message lands on the messages
-- stream, so this is not required for the feature to work — it only lets a
-- status change repaint without waiting for the message. Guarded because the
-- table may already be published, and because a project that manages realtime
-- from the dashboard has nothing here to do.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE price_offers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END;
$$;
