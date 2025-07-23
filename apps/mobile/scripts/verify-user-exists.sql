-- Check if user exists in auth.users
-- This will show if the user is still in the auth system

-- Check auth.users (this is read-only)
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    confirmed_at
FROM auth.users 
WHERE email = 'introversionary@gmail.com';

-- Check profiles
SELECT 
    id,
    email,
    created_at
FROM profiles 
WHERE email = 'introversionary@gmail.com';