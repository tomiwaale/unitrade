-- Mobile app support: push notification device tokens, listing geolocation,
-- and a locked-down phone-number lookup for the in-app "Call" feature.
-- Scoped to what the mobile app's Phase 0/1 work needs (auth, chat, calling,
-- location, push) — swap/order RPCs land in later migrations alongside those
-- features.

-- ── Push notification device tokens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device tokens"
  ON device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register their own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON device_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own device tokens"
  ON device_tokens FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON device_tokens TO authenticated;

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens(user_id);

-- ── Listing geolocation (pickup/meetup point a seller opts to pin) ──────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Column-level grants already scope INSERT/UPDATE on products (015_launch_hardening.sql);
-- extend them to include the new columns.
GRANT INSERT (
  seller_id, title, description, price, images, category, condition,
  open_to, location, listing_type, latitude, longitude
) ON products TO authenticated;
GRANT UPDATE (
  title, description, price, images, category, condition, open_to,
  location, listing_type, latitude, longitude, updated_at
) ON products TO authenticated;

-- ── Phone reveal for calling ─────────────────────────────────────────────────
-- profiles.phone is intentionally excluded from the public SELECT grant
-- (015_launch_hardening.sql). This returns it only when the caller already
-- shares a conversation or an order with the other user — i.e. they've
-- already been introduced through the marketplace.
CREATE OR REPLACE FUNCTION get_counterpart_phone(p_other_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_phone TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF v_caller_id = p_other_user_id THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE (buyer_id = v_caller_id AND seller_id = p_other_user_id)
       OR (buyer_id = p_other_user_id AND seller_id = v_caller_id)
    UNION ALL
    SELECT 1 FROM orders o
    JOIN products p ON p.id = o.product_id
    WHERE (o.buyer_id = v_caller_id AND p.seller_id = p_other_user_id)
       OR (o.buyer_id = p_other_user_id AND p.seller_id = v_caller_id)
  ) THEN
    RAISE EXCEPTION 'NO_SHARED_RELATIONSHIP';
  END IF;

  SELECT phone INTO v_phone FROM profiles WHERE id = p_other_user_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'PHONE_NOT_AVAILABLE';
  END IF;

  RETURN v_phone;
END;
$$;

REVOKE ALL ON FUNCTION get_counterpart_phone(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_counterpart_phone(UUID) TO authenticated;

-- ── Message notifications via trigger (client-agnostic) ─────────────────────
-- messages can be inserted directly by either the web server action or the
-- mobile app (RLS already allows it — see 006_chat.sql). Creating the
-- notification row in a trigger, rather than in application code, guarantees
-- it fires no matter which client sent the message.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_recipient_id UUID;
  v_product_title TEXT;
BEGIN
  SELECT c.buyer_id, c.seller_id, p.title
  INTO v_conversation
  FROM conversations c
  LEFT JOIN products p ON p.id = c.product_id
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_recipient_id := CASE
    WHEN NEW.sender_id = v_conversation.buyer_id THEN v_conversation.seller_id
    ELSE v_conversation.buyer_id
  END;

  INSERT INTO notifications (user_id, type, title, body, related_id)
  VALUES (
    v_recipient_id,
    'message',
    'New message',
    CASE WHEN v_conversation.title IS NOT NULL
      THEN 'About "' || v_conversation.title || '"'
      ELSE NULL
    END,
    NEW.conversation_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
