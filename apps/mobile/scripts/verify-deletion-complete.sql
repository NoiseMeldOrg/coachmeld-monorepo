-- Quick verification that introversionary@gmail.com is fully deleted
-- Run this to confirm the user can now sign up

-- This should return 0 rows if properly deleted
SELECT 
    'auth.users' as location,
    COUNT(*) as count 
FROM auth.users 
WHERE email = 'introversionary@gmail.com'

UNION ALL

SELECT 
    'profiles' as location,
    COUNT(*) as count 
FROM profiles 
WHERE email = 'introversionary@gmail.com';

-- If both counts are 0, you can sign up successfully
-- If auth.users count is 1, you need to delete from Dashboard
-- If profiles count is 1, run: DELETE FROM profiles WHERE email = 'introversionary@gmail.com';