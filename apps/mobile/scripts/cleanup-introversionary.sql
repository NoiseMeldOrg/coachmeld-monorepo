-- Cleanup orphaned data for introversionary@gmail.com
-- This user was deleted from auth.users but data remains in other tables

-- 1. Check what data exists for this user
SELECT 'profiles' as table_name, COUNT(*) as count 
FROM profiles WHERE id = '5cf56dc1-70bc-416c-ac4d-74e5b944c43d'
UNION ALL
SELECT 'messages', COUNT(*) 
FROM messages WHERE user_id = '5cf56dc1-70bc-416c-ac4d-74e5b944c43d'
UNION ALL
SELECT 'subscriptions', COUNT(*) 
FROM subscriptions WHERE user_id = '5cf56dc1-70bc-416c-ac4d-74e5b944c43d';

-- 2. Delete orphaned data
-- Delete messages
DELETE FROM messages WHERE user_id = '5cf56dc1-70bc-416c-ac4d-74e5b944c43d';

-- Delete subscriptions
DELETE FROM subscriptions WHERE user_id = '5cf56dc1-70bc-416c-ac4d-74e5b944c43d';

-- Delete profile (this is what's causing the signup error)
DELETE FROM profiles WHERE id = '5cf56dc1-70bc-416c-ac4d-74e5b944c43d';

-- 3. Also clean up by email in case there are multiple records
DELETE FROM profiles WHERE email = 'introversionary@gmail.com';

-- 4. Verify cleanup
SELECT 'Cleanup complete. Remaining records:' as status;
SELECT * FROM profiles WHERE email = 'introversionary@gmail.com';
SELECT id, email FROM auth.users WHERE email = 'introversionary@gmail.com';