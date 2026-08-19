-- Richer copy for new-message notifications.
--
-- 016_mobile_support.sql's notify_new_message() wrote a generic
-- "New message" + 'About "<product>"'. On a marketplace the signal that
-- actually matters to a seller is *who* reached out and *which listing* —
-- above all the first message a buyer sends, which is the "someone wants to
-- buy this" moment. Nothing downstream needs changing: the send-push Edge
-- Function (supabase/functions/send-push) and the in-app notifications
-- screen both read title/body straight off the row, so improving the
-- trigger improves the push banner too.

-- The trigger's "is this the opening message?" check, and watchMessages()
-- in the mobile app, both filter messages by conversation_id — 006_chat.sql
-- never indexed it.
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
  ON messages(conversation_id, created_at);

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

  -- Never notify someone about their own message. A conversation with
  -- buyer_id = seller_id shouldn't exist, but the trigger shouldn't be what
  -- breaks if one ever does.
  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(TRIM(full_name), '') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;
  v_sender_name := COALESCE(v_sender_name, 'A student');

  -- AFTER INSERT, so NEW is already in the table — exclude it.
  SELECT NOT EXISTS (
    SELECT 1 FROM messages
    WHERE conversation_id = NEW.conversation_id AND id <> NEW.id
  ) INTO v_is_opening_message;

  v_preview := TRIM(NEW.content);
  IF LENGTH(v_preview) > 140 THEN
    v_preview := LEFT(v_preview, 139) || '…';
  END IF;

  IF v_is_opening_message AND NEW.sender_id = v_buyer_id AND v_product_title IS NOT NULL THEN
    v_title := v_sender_name || ' is interested in "' || v_product_title || '"';
  ELSIF v_product_title IS NOT NULL THEN
    v_title := v_sender_name || ' about "' || v_product_title || '"';
  ELSE
    v_title := 'New message from ' || v_sender_name;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, related_id)
  VALUES (v_recipient_id, 'message', v_title, NULLIF(v_preview, ''), NEW.conversation_id);

  RETURN NEW;
END;
$$;
