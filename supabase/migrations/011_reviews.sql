CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are viewable by everyone." ON reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can insert their own reviews." ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX reviews_seller_id_idx ON reviews(seller_id);
CREATE INDEX reviews_product_id_idx ON reviews(product_id);
