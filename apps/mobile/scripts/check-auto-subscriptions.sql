-- Check for any triggers or functions that might be auto-creating subscriptions

-- 1. Check for triggers on profiles table
SELECT 'Triggers on profiles table:' as section;
SELECT 
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'profiles'::regclass;

-- 2. Check for triggers on auth.users
SELECT '';
SELECT 'Triggers on auth.users:' as section;
SELECT 
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- 3. Look for any function that creates subscriptions
SELECT '';
SELECT 'Functions that might create subscriptions:' as section;
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE prosrc LIKE '%INSERT%subscriptions%'
   OR prosrc LIKE '%test_subscription%';

-- 4. Check what happens when we check coach access
SELECT '';
SELECT 'Test coach access for new user:' as section;
-- Get a test user ID
WITH test_user AS (
    SELECT id FROM profiles WHERE email = 'michael@noisemeld.com' LIMIT 1
)
SELECT 
    c.name as coach_name,
    c.is_free,
    get_user_available_coaches(tu.id) as available_coaches
FROM coaches c, test_user tu
WHERE c.is_active = true
LIMIT 1;

-- 5. Check the get_user_available_coaches function
SELECT '';
SELECT 'Check get_user_available_coaches function:' as section;
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_user_available_coaches';