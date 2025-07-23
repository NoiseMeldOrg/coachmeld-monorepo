-- Migration: Add CASCADE DELETE to profiles foreign key
-- This ensures profiles are automatically deleted when auth.users are deleted

-- First, drop the existing foreign key constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add it back with CASCADE DELETE
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also add CASCADE DELETE to other tables that reference users
-- This ensures complete cleanup when a user is deleted

-- Messages table
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Subscriptions table
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Clean up any orphaned profiles while we're at it
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned messages
DELETE FROM messages
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned subscriptions
DELETE FROM subscriptions
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Verify the constraints were created
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public';