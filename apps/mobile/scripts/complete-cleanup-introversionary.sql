-- COMPLETE CLEANUP for introversionary@gmail.com
-- This will show ALL records and help clean them up properly

-- Step 1: Show ALL auth.users entries for this email
SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at,
    confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'introversionary@gmail.com'
ORDER BY created_at DESC;

-- Step 2: Show ALL profiles entries for this email
SELECT 
    'profiles' as table_name,
    id,
    email,
    created_at,
    full_name
FROM profiles 
WHERE email = 'introversionary@gmail.com'
ORDER BY created_at DESC;

-- Step 3: Show orphaned profiles (profiles without matching auth.users)
SELECT 
    'orphaned_profiles' as table_name,
    p.id,
    p.email,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL
  AND p.email = 'introversionary@gmail.com';

-- Step 4: Show the specific profiles causing errors
SELECT 
    'error_profiles' as table_name,
    id,
    email,
    created_at
FROM profiles 
WHERE id IN (
    'ed69d226-2a81-4ae5-851d-f958ce2aa68f',
    'f4c509dc-4677-4b40-8313-609aa7c6f6a0',
    '9040d30b-104e-4574-9e1b-1aa8823d557e'
);

-- Step 5: CLEANUP COMMANDS
-- Run these ONE AT A TIME after reviewing the above results:

-- Option A: Delete ALL profiles for this email (recommended)
-- DELETE FROM profiles WHERE email = 'introversionary@gmail.com';

-- Option B: Delete specific problematic profiles
-- DELETE FROM profiles WHERE id IN (
--     'ed69d226-2a81-4ae5-851d-f958ce2aa68f',
--     'f4c509dc-4677-4b40-8313-609aa7c6f6a0',
--     '9040d30b-104e-4574-9e1b-1aa8823d557e'
-- );

-- Option C: Delete ALL orphaned profiles (not just for this email)
-- DELETE FROM profiles p
-- WHERE NOT EXISTS (
--     SELECT 1 FROM auth.users u WHERE u.id = p.id
-- );

-- Step 6: After cleanup, verify
-- This should return 0 profiles
-- SELECT COUNT(*) as profile_count FROM profiles WHERE email = 'introversionary@gmail.com';