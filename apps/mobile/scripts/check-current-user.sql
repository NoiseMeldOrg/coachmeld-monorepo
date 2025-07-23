-- Check all users and their test status
-- This will help identify which account to use for testing

-- 1. Show all users with test-eligible domains
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    created_at,
    CASE 
        WHEN is_test_user = true THEN '✅ Test User'
        WHEN email LIKE '%@noisemeld.com' THEN '⚠️ Should be test user (team domain)'
        WHEN email LIKE '%@test.coachmeld.com' THEN '⚠️ Should be test user (test domain)'
        WHEN email LIKE '%@beta.coachmeld.com' THEN '⚠️ Should be test user (beta domain)'
        ELSE '❌ Regular User'
    END as status
FROM profiles 
ORDER BY created_at DESC;

-- 2. Quick fix: Enable test user for all team domains
UPDATE profiles 
SET 
    is_test_user = true,
    test_user_type = 'internal'
WHERE email LIKE '%@noisemeld.com'
  AND is_test_user = false;

-- 3. Enable test user for specific email (replace with your email)
-- UPDATE profiles 
-- SET is_test_user = true, test_user_type = 'beta'
-- WHERE email = 'your-email@example.com';