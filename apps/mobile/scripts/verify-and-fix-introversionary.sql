-- STEP 1: First, let's verify the current state
-- This will show us exactly what exists for introversionary@gmail.com

-- Check if user exists in auth.users (read-only table)
SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at,
    confirmed_at
FROM auth.users 
WHERE email = 'introversionary@gmail.com';

-- Check if profile exists
SELECT 
    'profiles' as table_name,
    id,
    email,
    created_at
FROM profiles 
WHERE email = 'introversionary@gmail.com';

-- STEP 2: If the user exists in auth.users but NOT in profiles:
-- You MUST delete from the Dashboard: Authentication → Users → Checkbox → Delete button

-- STEP 3: If there's an orphaned profile (no auth.users entry), run this:
-- DELETE FROM profiles WHERE email = 'introversionary@gmail.com';

-- STEP 4: After deletion, verify everything is clean:
SELECT 'Final check - should return no rows:' as status;
SELECT * FROM auth.users WHERE email = 'introversionary@gmail.com';
SELECT * FROM profiles WHERE email = 'introversionary@gmail.com';