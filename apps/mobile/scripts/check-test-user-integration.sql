-- Check Test User Integration Issues
-- This script helps diagnose issues with the test user system

-- 1. Check if all required columns exist in profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
    'is_test_user', 
    'test_subscriptions', 
    'test_user_type', 
    'test_expires_at', 
    'test_user_metadata'
)
ORDER BY ordinal_position;

-- 2. Check if any test users exist
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    test_expires_at,
    test_user_metadata,
    created_at
FROM profiles
WHERE is_test_user = true
OR email LIKE '%@noisemeld.com'
OR email LIKE '%@test.coachmeld.com'
OR email LIKE '%@beta.coachmeld.com'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for recent signup attempts
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 4. Check if there are any profile creation errors in the last 24 hours
-- (This would need to be in your application logs, not database)

-- 5. Check the current migration status
SELECT 
    version,
    name,
    executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%test_user%' 
OR name LIKE '%enhanced%'
OR name = '005_enhanced_test_users'
ORDER BY version;

-- 6. Test the checkAndEnrollTestUser function manually
-- Replace 'test@noisemeld.com' with an actual test email
DO $$
DECLARE
    test_email TEXT := 'test@noisemeld.com';
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Check if email should be enrolled
    IF test_email LIKE '%@noisemeld.com' 
    OR test_email LIKE '%@test.coachmeld.com' 
    OR test_email LIKE '%@beta.coachmeld.com' THEN
        RAISE NOTICE 'Email % should be enrolled as test user', test_email;
    ELSE
        RAISE NOTICE 'Email % is not a test domain', test_email;
    END IF;
END $$;