-- Migration: Update diet_type usage 
-- This migration keeps diet_type in the profiles table for user preferences
-- but removes its usage from coach selection logic

-- The diet_type column in profiles table remains unchanged
-- It allows users to specify their current diet preference

-- Add a comment to clarify the column's purpose
COMMENT ON COLUMN profiles.diet_type IS 'User''s current diet preference - for informational purposes only, not used for coach selection';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Updated diet_type column comment to clarify it is for user preference only';
END $$;

-- Note: Coach access is managed through the coach_document_access table
-- Diet type is no longer used for filtering coaches or documents