CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('order_issue', 'payment', 'account', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on support_tickets when a new message arrives
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_message_bumps_ticket
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_timestamp();

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can open tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages on their tickets" ON support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages on their open tickets" ON support_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND user_id = auth.uid() AND status != 'closed'
    )
  );

-- Indexes
CREATE INDEX support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX support_tickets_status_idx ON support_tickets(status);
CREATE INDEX support_tickets_updated_at_idx ON support_tickets(updated_at DESC);
CREATE INDEX support_messages_ticket_id_idx ON support_messages(ticket_id);
