-- Check ALL instances of introversionary@gmail.com in both tables
-- This will show us all the duplicate/orphaned records

-- Check auth.users
SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at,
    confirmed_at
FROM auth.users 
WHERE email = 'introversionary@gmail.com'
ORDER BY created_at DESC;

-- Check profiles
SELECT 
    'profiles' as table_name,
    id,
    email,
    created_at,
    full_name
FROM profiles 
WHERE email = 'introversionary@gmail.com'
ORDER BY created_at DESC;

-- Check this specific profile that's causing the error
SELECT 
    'specific_profile' as table_name,
    id,
    email,
    created_at,
    full_name
FROM profiles 
WHERE id = 'f4c509dc-4677-4b40-8313-609aa7c6f6a0';

-- Clean up ALL orphaned profiles for this email
-- UNCOMMENT AND RUN THESE AFTER REVIEWING THE ABOVE RESULTS:
-- DELETE FROM profiles WHERE email = 'introversionary@gmail.com';
-- DELETE FROM profiles WHERE id = 'f4c509dc-4677-4b40-8313-609aa7c6f6a0';