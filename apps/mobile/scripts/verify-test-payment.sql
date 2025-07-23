-- Verify Test Payment and Coach Access
-- Replace 'test@example.com' with your test user email

-- 1. Check if user has an active subscription
SELECT 
    s.id as subscription_id,
    s.user_id,
    s.coach_id,
    s.status,
    s.is_test_subscription,
    c.name as coach_name,
    c.coach_type,
    p.email
FROM subscriptions s
JOIN coaches c ON s.coach_id = c.id
JOIN profiles p ON s.user_id = p.id
WHERE p.email = 'test@example.com'  -- Replace with your test email
  AND s.status = 'active'
ORDER BY s.created_at DESC;

-- 2. Check user's available coaches
SELECT * FROM get_user_available_coaches(
    (SELECT id FROM profiles WHERE email = 'test@example.com')
);

-- 3. Verify the user can access the coach
SELECT can_user_access_coach(
    (SELECT id FROM profiles WHERE email = 'test@example.com'),
    (SELECT id FROM coaches WHERE name = 'Carnivore Coach Pro')
);

-- 4. Check test user status
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    test_user_metadata
FROM profiles 
WHERE email = 'test@example.com';