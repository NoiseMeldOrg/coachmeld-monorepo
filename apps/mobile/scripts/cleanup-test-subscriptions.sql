-- Clean up any test subscriptions for michael@noisemeld.com
-- This ensures test users start fresh without automatic access

-- First, check what subscriptions exist
SELECT 'Current subscriptions for michael@noisemeld.com:' as info;
SELECT 
    s.id,
    c.name as coach_name,
    s.status,
    s.is_test_subscription,
    s.created_at
FROM subscriptions s
JOIN coaches c ON s.coach_id = c.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
ORDER BY s.created_at DESC;

-- Delete ALL subscriptions for this user to start fresh
DELETE FROM subscriptions 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com');

-- Verify deletion
SELECT 'After cleanup - should be empty:' as info;
SELECT COUNT(*) as remaining_subscriptions
FROM subscriptions
WHERE user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com');