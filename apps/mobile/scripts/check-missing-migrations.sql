-- Better check for migrations 015 and 016
-- These migrations might not show up properly in the first check

-- Check RLS status on profiles table (Migration 015)
SELECT 
    '015_fix_profile_creation_rls' as migration,
    relname as table_name,
    relrowsecurity as rls_enabled,
    CASE 
        WHEN relrowsecurity THEN '❌ RLS is enabled - Migration NOT applied'
        ELSE '✅ RLS is disabled - Migration applied'
    END as status
FROM pg_class
WHERE relname = 'profiles';

-- Check foreign key constraints (Migration 016)
SELECT 
    '016_add_cascade_delete' as migration,
    conname as constraint_name,
    confdeltype,
    CASE 
        WHEN confdeltype = 'c' THEN '✅ CASCADE DELETE enabled'
        WHEN confdeltype = 'r' THEN '❌ RESTRICT (no cascade)'
        WHEN confdeltype = 'a' THEN '❌ NO ACTION (no cascade)'
        ELSE '❌ Unknown delete rule'
    END as status
FROM pg_constraint
WHERE contype = 'f'  -- foreign key constraints
  AND conrelid IN ('profiles'::regclass, 'messages'::regclass, 'subscriptions'::regclass)
  AND confrelid = 'auth.users'::regclass;

-- Show what migrations 015 and 016 would do
SELECT '';
SELECT '🚨 MIGRATIONS NEEDED:' as action;
SELECT 'Migration 015: Disables RLS on profiles table to fix signup issues' as description
UNION ALL
SELECT 'Migration 016: Adds CASCADE DELETE to ensure proper cleanup when users are deleted' as description;