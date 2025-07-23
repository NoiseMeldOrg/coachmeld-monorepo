-- Add admin support to profiles table
-- This enables the admin role system used by RAG migrations

-- Add metadata column to profiles for storing role and other data
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create an admin check function for easier querying
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND metadata->>'role' = 'admin'
    );
END;
$$;

-- Example: To make a user an admin after they sign up, run:
-- UPDATE profiles 
-- SET metadata = jsonb_set(metadata, '{role}', '"admin"'::jsonb)
-- WHERE email = 'admin@example.com';

-- Add comment explaining the metadata field
COMMENT ON COLUMN profiles.metadata IS 'JSONB field for storing additional user data like role (admin, user), preferences, etc.';

-- Create an index on the role for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles ((metadata->>'role'));