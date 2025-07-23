-- Check test user status for debugging payment modal issues
-- Replace with your actual email

SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    test_user_metadata,
    created_at
FROM profiles 
WHERE email IN (
    'michael@noisemeld.com',
    'mb2.0beta@gmail.com',
    'test@noisemeld.com',
    'introversionary@gmail.com',
    'payment-test@gmail.com'
)
ORDER BY created_at DESC;

-- If you need to enable test user status manually:
-- UPDATE profiles 
-- SET is_test_user = true
-- WHERE email = 'your-email@example.com';