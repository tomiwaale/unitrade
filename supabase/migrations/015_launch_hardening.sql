-- Launch hardening: schema drift fixes, safer profile permissions, private ID uploads,
-- wishlists, review/swap RLS, and atomic checkout reservations.

-- ── Missing profile fields used by the app ───────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subaccount_code TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_school_id_status_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_school_id_status_check
  CHECK (school_id_status IN ('none', 'pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON profiles(phone)
  WHERE phone IS NOT NULL;

-- Prevent users from directly mutating protected profile columns via the anon key.
-- Server actions/admin use the service role for KYC and payout changes.
REVOKE INSERT, UPDATE ON profiles FROM anon, authenticated;
GRANT INSERT (id, full_name, university, phone) ON profiles TO authenticated;
GRANT UPDATE (full_name, university, phone) ON profiles TO authenticated;

-- Keep sensitive profile columns out of public/authenticated PostgREST selects.
-- Public marketplace surfaces only need identity/display fields.
REVOKE SELECT ON profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, university, created_at) ON profiles TO anon, authenticated;
GRANT SELECT (is_admin) ON profiles TO authenticated;

-- ── Wishlists ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wishlists" ON wishlists;
DROP POLICY IF EXISTS "Users can save products" ON wishlists;
DROP POLICY IF EXISTS "Users can remove their saved products" ON wishlists;

CREATE POLICY "Users can view their own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save products"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their saved products"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON wishlists TO authenticated;

CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS wishlists_product_id_idx ON wishlists(product_id);

-- ── Private storage for school IDs ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-ids',
  'school-ids',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload school ids" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own school ids" ON storage.objects;
DROP POLICY IF EXISTS "Users can replace their own school ids" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own school ids" ON storage.objects;

CREATE POLICY "Users can upload school ids" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own school ids" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'school-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can replace their own school ids" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'school-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own school ids" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Tighten product/order direct access ──────────────────────────────────────
DROP POLICY IF EXISTS "Sellers can delete their own products." ON products;
CREATE POLICY "Sellers can delete inactive products without escrow orders." ON products
  FOR DELETE
  USING (
    auth.uid() = seller_id
    AND NOT EXISTS (
      SELECT 1
      FROM orders
      WHERE orders.product_id = products.id
        AND orders.status IN ('pending', 'paid', 'confirmed', 'disputed')
    )
  );

REVOKE INSERT, UPDATE ON products FROM anon, authenticated;
GRANT INSERT (
  seller_id,
  title,
  description,
  price,
  images,
  category,
  condition,
  open_to,
  location,
  listing_type
) ON products TO authenticated;
GRANT UPDATE (
  title,
  description,
  price,
  images,
  category,
  condition,
  open_to,
  location,
  listing_type,
  updated_at
) ON products TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON orders FROM anon, authenticated;

-- Users should only mark notifications as read, not rewrite notification content.
REVOKE UPDATE ON notifications FROM anon, authenticated;
GRANT UPDATE (read) ON notifications TO authenticated;

-- ── Stronger reviews and swaps RLS ───────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can insert their own reviews." ON reviews;
CREATE POLICY "Buyers can review completed orders they bought." ON reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
      FROM orders
      JOIN products ON products.id = orders.product_id
      WHERE orders.id = order_id
        AND orders.buyer_id = auth.uid()
        AND orders.status = 'confirmed'
        AND products.seller_id = seller_id
        AND products.id = product_id
    )
  );

DROP POLICY IF EXISTS "Buyers can create swap offers" ON swap_offers;
CREATE POLICY "Buyers can create valid swap offers" ON swap_offers
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1
      FROM products wanted
      WHERE wanted.id = wanted_product_id
        AND wanted.status = 'active'
        AND wanted.seller_id = seller_id
        AND wanted.seller_id <> auth.uid()
        AND wanted.open_to IN ('cash-or-swap', 'swap-only')
    )
    AND EXISTS (
      SELECT 1
      FROM products offered
      WHERE offered.id = offered_product_id
        AND offered.status = 'active'
        AND offered.seller_id = auth.uid()
    )
  );

-- Swap state changes are mediated by server actions using the service role.
REVOKE UPDATE ON swap_offers FROM anon, authenticated;

-- ── Checkout reservation support ────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_pending_checkout_expires_idx
  ON orders(checkout_expires_at)
  WHERE status = 'pending';

-- Expire duplicate open orders before adding the uniqueness guard.
-- Covers all statuses the index watches: pending, paid, confirmed, disputed.
-- Within each product, keep the most recent row and expire older duplicates.
WITH ranked_open AS (
  SELECT
    id,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY created_at DESC
    ) AS rn
  FROM orders
  WHERE product_id IS NOT NULL
    AND status IN ('pending', 'paid', 'confirmed', 'disputed')
)
UPDATE orders
SET status = 'expired'
WHERE id IN (SELECT id FROM ranked_open WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_open_order_per_product_idx
  ON orders(product_id)
  WHERE product_id IS NOT NULL
    AND status IN ('pending', 'paid', 'confirmed', 'disputed');

CREATE OR REPLACE FUNCTION expire_checkout_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE orders
  SET status = 'expired'
  WHERE status = 'pending'
    AND checkout_expires_at IS NOT NULL
    AND checkout_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
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
  UPDATE orders
  SET status = 'expired'
  WHERE paystack_reference = p_reference
    AND status = 'pending';

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION reserve_product_for_checkout(
  p_product_id UUID,
  p_reference TEXT
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
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_reference IS NULL OR LENGTH(TRIM(p_reference)) < 8 THEN
    RAISE EXCEPTION 'INVALID_REFERENCE';
  END IF;

  PERFORM expire_checkout_reservations();

  SELECT
    products.id,
    products.price,
    products.seller_id,
    products.status,
    profiles.subaccount_code
  INTO v_product
  FROM products
  JOIN profiles ON profiles.id = products.seller_id
  WHERE products.id = p_product_id
  FOR UPDATE OF products;

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

  IF EXISTS (
    SELECT 1
    FROM orders
    WHERE product_id = p_product_id
      AND status IN ('pending', 'paid', 'confirmed', 'disputed')
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
    v_product.price,
    p_reference,
    'pending',
    NOW() + INTERVAL '45 minutes'
  )
  RETURNING id INTO v_order_id;

  RETURN QUERY
  SELECT v_order_id, v_product.price::NUMERIC, v_product.subaccount_code::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'PRODUCT_CHECKOUT_RESERVED';
END;
$$;

REVOKE ALL ON FUNCTION expire_checkout_reservations() FROM PUBLIC;
REVOKE ALL ON FUNCTION release_checkout_reservation(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reserve_product_for_checkout(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION reserve_product_for_checkout(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_checkout_reservation(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION expire_checkout_reservations() TO service_role;
