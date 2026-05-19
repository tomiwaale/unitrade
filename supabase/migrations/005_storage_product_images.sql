-- Create public bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB hard limit (compression happens client-side first)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload into their own folder
CREATE POLICY "Users can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can view product images (public catalog)
CREATE POLICY "Public read for product images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Users can delete their own uploads
CREATE POLICY "Users can delete their product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
