-- Run this in your Supabase SQL Editor to add escrow fields to an existing database.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- Profiles: replace subaccount model with transfer recipient model
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recipient_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Orders: add escrow lifecycle timestamps
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;
