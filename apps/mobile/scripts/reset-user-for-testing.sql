-- Reset user for testing payment flow without deleting the account
-- Just removes subscriptions so they can test the payment flow again

-- Replace with your test email
SET session my.test_email = 'michael@noisemeld.com';

-- 1. Show current subscriptions
SELECT 'Current subscriptions:' as info;
SELECT 
    s.id,
    c.name as coach_name,
    s.status,
    s.is_test_subscription,
    s.created_at
FROM subscriptions s
JOIN coaches c ON s.coach_id = c.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = current_setting('my.test_email'))
ORDER BY s.created_at DESC;

-- 2. Delete all subscriptions for this user
DELETE FROM subscriptions 
WHERE user_id = (SELECT id FROM profiles WHERE email = current_setting('my.test_email'));

-- 3. Verify user still exists and is a test user
SELECT 'User status after reset:' as info;
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    created_at
FROM profiles 
WHERE email = current_setting('my.test_email');

-- 4. Verify no subscriptions remain
SELECT 'Subscriptions after reset (should be empty):' as info;
SELECT COUNT(*) as subscription_count
FROM subscriptions
WHERE user_id = (SELECT id FROM profiles WHERE email = current_setting('my.test_email'));

-- User is now ready to test the payment flow again!