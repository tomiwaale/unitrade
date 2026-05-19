-- Add is_admin flag to profiles.
-- After running, grant admin access with:
-- UPDATE profiles SET is_admin = true WHERE id = '<your-user-uuid>';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
