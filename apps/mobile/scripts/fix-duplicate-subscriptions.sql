-- Fix duplicate subscription error
-- This happens when trying to create a subscription that already exists

-- 1. Check existing subscriptions for the user
SELECT 'Current subscriptions:' as info;
SELECT 
    s.id,
    s.user_id,
    s.coach_id,
    c.name as coach_name,
    s.status,
    s.is_test_subscription,
    s.created_at,
    s.updated_at
FROM subscriptions s
JOIN coaches c ON s.coach_id = c.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
ORDER BY s.created_at DESC;

-- 2. Show the unique constraint
SELECT '';
SELECT 'Unique constraint details:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'subscriptions_user_id_coach_id_status_key';

-- 3. Find duplicate active subscriptions
SELECT '';
SELECT 'Duplicate active subscriptions:' as info;
SELECT 
    user_id,
    coach_id,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as subscription_ids
FROM subscriptions
WHERE status = 'active'
GROUP BY user_id, coach_id
HAVING COUNT(*) > 1;

-- 4. Clean up old/inactive subscriptions for the user
-- This will keep only the most recent subscription per coach
DELETE FROM subscriptions
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id, coach_id ORDER BY created_at DESC) as rn
        FROM subscriptions
        WHERE user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
    ) t
    WHERE rn > 1
);

-- 5. Update any existing active subscriptions to cancelled before creating new ones
-- UNCOMMENT if you want to cancel all existing subscriptions
/*
UPDATE subscriptions
SET status = 'cancelled'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
  AND status = 'active';
*/

-- 6. Verify cleanup
SELECT '';
SELECT 'After cleanup:' as info;
SELECT 
    s.coach_id,
    c.name as coach_name,
    s.status,
    COUNT(*) as count
FROM subscriptions s
JOIN coaches c ON s.coach_id = c.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
GROUP BY s.coach_id, c.name, s.status
ORDER BY c.name;