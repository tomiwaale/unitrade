CREATE TABLE swap_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wanted_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  offered_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT,
  -- optional cash the buyer adds on top of their item (paid in person at handoff)
  cash_topup DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- pending | accepted | declined | cancelled
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE swap_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view swap offers"
  ON swap_offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create swap offers"
  ON swap_offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update swap offers"
  ON swap_offers FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
