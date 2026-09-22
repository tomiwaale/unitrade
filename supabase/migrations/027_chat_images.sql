-- Image attachments in chat.
--
-- 006_chat.sql's messages table is text-only. Buyers asking "can you send a
-- photo of the back?" currently have to leave the app, so add an image_url
-- alongside content and let either one be the payload.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- An image-only message has no text. Relax the NOT NULL from 006_chat.sql
-- but keep an empty message impossible.
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_or_image_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_or_image_check
  CHECK (NULLIF(TRIM(content), '') IS NOT NULL OR image_url IS NOT NULL);

-- ── Storage ──────────────────────────────────────────────────────────────────
-- Public read, mirroring product-images: the URL is an unguessable
-- uuid path and cached_network_image / next/image both want to fetch it
-- without minting a signed URL per bubble.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public read for chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their chat images" ON storage.objects;

CREATE POLICY "Users can upload chat images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read for chat images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete their chat images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Notification copy ────────────────────────────────────────────────────────
-- 025_message_notification_content.sql built the push body from
-- TRIM(NEW.content), which is now NULL for an image-only message and would
-- push a titled notification with an empty body. Give photos their own
-- preview line instead.
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

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(TRIM(full_name), '') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;
  v_sender_name := COALESCE(v_sender_name, 'A student');

  SELECT NOT EXISTS (
    SELECT 1 FROM messages
    WHERE conversation_id = NEW.conversation_id AND id <> NEW.id
  ) INTO v_is_opening_message;

  v_preview := NULLIF(TRIM(COALESCE(NEW.content, '')), '');
  IF v_preview IS NULL AND NEW.image_url IS NOT NULL THEN
    v_preview := '📷 Photo';
  ELSIF LENGTH(v_preview) > 140 THEN
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
  VALUES (v_recipient_id, 'message', v_title, v_preview, NEW.conversation_id);

  RETURN NEW;
END;
$$;
