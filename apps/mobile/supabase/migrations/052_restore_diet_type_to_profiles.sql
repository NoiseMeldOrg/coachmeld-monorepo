-- Migration: Restore diet_type column to profiles table
-- The diet_type column should remain in profiles for user preferences
-- It was accidentally removed in migration 050

-- Re-add the diet_type column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS diet_type TEXT CHECK (diet_type IN ('paleo', 'lowcarb', 'keto', 'ketovore', 'carnivore', 'lion'));

-- Add comment to clarify the column's purpose
COMMENT ON COLUMN profiles.diet_type IS 'User''s current diet preference - for informational purposes only, not used for coach selection';

-- Re-create the index for performance (optional, but useful for profile filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_diet_type ON profiles(diet_type);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully restored diet_type column to profiles table';
    RAISE NOTICE 'Diet type is for user preference tracking only and does not affect coach selection';
END $$;