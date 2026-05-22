-- Add Paystack subaccount_code to profiles for split payment support.
-- Sellers set this when they configure their payout account.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subaccount_code TEXT;
