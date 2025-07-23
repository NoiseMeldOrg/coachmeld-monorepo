-- Debug why michael@noisemeld.com has access to all coaches
-- This will help identify the issue

-- 1. Get user details
SELECT 'User Profile:' as section;
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    created_at
FROM profiles 
WHERE email = 'michael@noisemeld.com';

-- 2. Check existing subscriptions
SELECT '';
SELECT 'Active Subscriptions:' as section;
SELECT 
    s.id,
    s.coach_id,
    c.name as coach_name,
    s.status,
    s.is_test_subscription,
    s.created_at
FROM subscriptions s
JOIN coaches c ON s.coach_id = c.id
WHERE s.user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
  AND s.status IN ('active', 'trial');

-- 3. Test the can_user_access_coach function for each coach
SELECT '';
SELECT 'Coach Access Check:' as section;
SELECT 
    c.id,
    c.name,
    c.is_free,
    can_user_access_coach(
        (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com'),
        c.id
    ) as has_access
FROM coaches c
WHERE c.is_active = true
ORDER BY c.sort_order;

-- 4. Check if the new function exists
SELECT '';
SELECT 'Function Check:' as section;
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_user_access_coach';

-- 5. Clean up test subscriptions if needed
-- UNCOMMENT AND RUN THIS TO REMOVE ALL TEST SUBSCRIPTIONS:
/*
DELETE FROM subscriptions 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'michael@noisemeld.com')
  AND is_test_subscription = true;
*/