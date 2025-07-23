-- Migration: 019_add_stripe_customer_to_profiles.sql
-- Description: Add Stripe customer ID to profiles table

-- Add stripe_customer_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;