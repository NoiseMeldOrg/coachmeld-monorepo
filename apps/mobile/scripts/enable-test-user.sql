-- Enable test user status to see test payment modal
-- This script enables test payments for specific users

-- First, check current status
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    CASE 
        WHEN email LIKE '%@noisemeld.com' THEN 'Should be test user (team domain)'
        WHEN email LIKE '%@test.coachmeld.com' THEN 'Should be test user (test domain)'
        WHEN email LIKE '%@beta.coachmeld.com' THEN 'Should be test user (beta domain)'
        ELSE 'Regular user'
    END as expected_status
FROM profiles 
WHERE email IN (
    'michael@noisemeld.com',
    'mb2.0beta@gmail.com',
    'test@noisemeld.com'
)
ORDER BY created_at DESC;

-- Enable test user status for team members
UPDATE profiles 
SET 
    is_test_user = true,
    test_user_type = CASE 
        WHEN email LIKE '%@noisemeld.com' THEN 'internal'
        WHEN email LIKE '%@test.coachmeld.com' THEN 'beta'
        WHEN email LIKE '%@beta.coachmeld.com' THEN 'beta'
        ELSE 'beta'
    END
WHERE email LIKE '%@noisemeld.com'
   OR email = 'mb2.0beta@gmail.com';  -- Add this user as test user too

-- Verify the update
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    'Updated' as status
FROM profiles 
WHERE email IN (
    'michael@noisemeld.com',
    'mb2.0beta@gmail.com',
    'test@noisemeld.com'
)
ORDER BY created_at DESC;