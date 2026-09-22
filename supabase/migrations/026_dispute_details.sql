-- Structured disputes.
--
-- disputeOrder() (lib/orders.ts) only ever flipped orders.status to
-- 'disputed' and emailed support — the buyer's actual complaint lived
-- nowhere, so an admin opening /admin/disputes saw a frozen payment with no
-- reason attached. The mobile dispute sheet collects a reason, a written
-- explanation and up to 3 photos; these columns are where that lands.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_explanation TEXT,
  ADD COLUMN IF NOT EXISTS dispute_evidence TEXT[] NOT NULL DEFAULT '{}';

-- Kept in sync with DISPUTE_REASONS in
-- mobile/lib/features/orders/presentation/dispute_modal.dart. NULL stays
-- legal for the disputes filed before this migration.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_dispute_reason_check;
ALTER TABLE orders ADD CONSTRAINT orders_dispute_reason_check
  CHECK (dispute_reason IS NULL OR dispute_reason IN (
    'item_not_received',
    'item_damaged',
    'wrong_item',
    'seller_no_show',
    'other'
  ));

-- ── Private storage for dispute evidence ─────────────────────────────────────
-- Private, not public like product-images: these are photos of a soured
-- transaction and only the uploader plus the service-role client (which
-- bypasses RLS, and is what /admin/disputes and the support emails use)
-- have any business reading them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own dispute evidence" ON storage.objects;

CREATE POLICY "Users can upload dispute evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own dispute evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE/DELETE policy on purpose: evidence attached to an open dispute
-- shouldn't be editable by the party who filed it.
