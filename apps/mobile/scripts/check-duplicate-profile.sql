-- Check for the duplicate profile that's causing the error
SELECT 
    id,
    email,
    created_at,
    full_name
FROM profiles 
WHERE id = 'ed69d226-2a81-4ae5-851d-f958ce2aa68f';

-- Also check if this user exists in auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE id = 'ed69d226-2a81-4ae5-851d-f958ce2aa68f';

-- Clean up the orphaned profile if needed
-- DELETE FROM profiles WHERE id = 'ed69d226-2a81-4ae5-851d-f958ce2aa68f';