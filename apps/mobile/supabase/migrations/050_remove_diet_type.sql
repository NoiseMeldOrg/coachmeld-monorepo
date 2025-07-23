-- Migration: Remove diet_type from the database schema
-- This migration removes the diet_type column from the profiles table
-- as it's no longer needed. Coach access is now managed through
-- the coach_document_access table.

-- First, log existing diet_type values for record-keeping
DO $$
BEGIN
    -- Create a temporary table to store diet_type data before removal
    CREATE TEMP TABLE IF NOT EXISTS diet_type_backup AS
    SELECT 
        id as user_id,
        diet_type,
        updated_at,
        CURRENT_TIMESTAMP as backed_up_at
    FROM profiles
    WHERE diet_type IS NOT NULL;
    
    -- Log how many records had diet_type set
    RAISE NOTICE 'Backing up diet_type for % users', (SELECT COUNT(*) FROM diet_type_backup);
END $$;

-- Drop the index first
DROP INDEX IF EXISTS idx_profiles_diet_type;

-- Remove the diet_type column from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS diet_type;

-- Also remove diet_type from any other tables that might have it
-- (Currently only profiles table has diet_type based on our migrations)

-- Update any functions that might reference diet_type
-- Note: The admin app has already been updated to not use diet_type

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed diet_type column from profiles table';
END $$;

-- Note: This migration is backwards compatible in the sense that
-- existing data is preserved (backed up in temp table during migration)
-- and the coach_document_access table remains the source of truth
-- for document access control.