-- Profile avatars.
--
-- profiles (supabase/schema.sql) has never had an avatar — the web app
-- renders initials. The mobile profile screen wants a real picture, and
-- it's the same column the web app will read when it catches up.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Public read: profiles themselves are already world-readable
-- ("Public profiles are viewable by everyone." in schema.sql) and an avatar
-- shows up next to every listing and chat bubble.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB; avatars are compressed and displayed at ~96px
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can replace their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read for avatars" ON storage.objects;

CREATE POLICY "Users can upload their avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can replace their avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read for avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');
