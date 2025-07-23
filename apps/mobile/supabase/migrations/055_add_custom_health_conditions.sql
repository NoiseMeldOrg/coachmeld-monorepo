-- Migration: Add custom_health_conditions column to profiles table
-- This allows users to enter free-text health conditions not in the predefined list

-- Add custom_health_conditions column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS custom_health_conditions TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.custom_health_conditions IS 'Free-text field for additional health conditions not covered by the standard list';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added custom_health_conditions column to profiles table';
    RAISE NOTICE 'Users can now enter custom health conditions for AI coach context';
END $$;