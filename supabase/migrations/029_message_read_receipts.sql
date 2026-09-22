-- Read receipts in chat.
--
-- The mobile conversation screen shows ✓ sent / ✓✓ read under each of your
-- own bubbles; without this column both ticks would be a lie.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- markConversationRead() stamps every unread message from the counterpart in
-- one statement, so the partial index is what keeps that cheap.
CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON messages(conversation_id, sender_id)
  WHERE read_at IS NULL;

-- 006_chat.sql gave messages SELECT and INSERT policies but no UPDATE, so
-- nothing can currently write read_at. Allow it only on messages you did NOT
-- send — marking your own message read is meaningless, and this stops one
-- participant editing the other's history.
DROP POLICY IF EXISTS "Participants can mark messages read" ON messages;
CREATE POLICY "Participants can mark messages read" ON messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- RLS gates rows, not columns: without this an authenticated participant
-- could satisfy the policy above and still rewrite content or image_url on
-- the other person's message. Narrow the grant to the one column they need.
REVOKE UPDATE ON messages FROM authenticated;
GRANT UPDATE (read_at) ON messages TO authenticated;
