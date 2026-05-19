-- NIN KYC verification fields for vendor onboarding.
-- nin_last4 stores only the final 4 digits for display; full NIN is never persisted.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nin_last4 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nin_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nin_verified_at TIMESTAMPTZ;
