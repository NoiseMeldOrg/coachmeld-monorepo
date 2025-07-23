-- Check which migrations have been applied to your database
-- This script checks for the existence of tables, columns, and functions
-- that would be created by migrations 013-017

-- Migration 013: Conversation Memory
SELECT '013_conversation_memory' as migration, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'conversation_summaries') as applied,
       'Should have conversation_summaries table' as description;

-- Migration 014: Enhanced Test Users
SELECT '014_enhanced_test_users' as migration,
       EXISTS(SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'profiles' 
              AND column_name = 'test_user_type') as applied,
       'Should have test_user_type column in profiles' as description;

-- Migration 015: Fix Profile Creation RLS
-- This one disabled RLS, so we check if RLS is enabled
SELECT '015_fix_profile_creation_rls' as migration,
       NOT relrowsecurity as applied,
       'RLS should be disabled on profiles table' as description
FROM pg_class
WHERE relname = 'profiles';

-- Migration 016: Add Cascade Delete
-- Check if foreign keys have CASCADE DELETE
SELECT '016_add_cascade_delete' as migration,
       confdeltype = 'c' as applied,
       'profiles foreign key should have CASCADE DELETE' as description
FROM pg_constraint
WHERE conname = 'profiles_id_fkey'
  AND conrelid = 'profiles'::regclass;

-- Migration 017: Modify Test User Coach Access
-- Check if the updated function exists (without test user auto-access)
SELECT '017_modify_test_user_coach_access' as migration,
       EXISTS(
         SELECT 1 FROM pg_proc 
         WHERE proname = 'can_user_use_test_payment'
       ) as applied,
       'Should have can_user_use_test_payment function' as description;

-- Additional check: List all functions to see what's there
SELECT '';
SELECT 'All functions in database:' as info;
SELECT proname as function_name, 
       pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Check specific columns that should exist
SELECT '';
SELECT 'Checking specific columns from migrations:' as info;
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN table_name = 'profiles' AND column_name = 'test_user_type' THEN 'From migration 014'
        WHEN table_name = 'profiles' AND column_name = 'test_expires_at' THEN 'From migration 014'
        WHEN table_name = 'profiles' AND column_name = 'test_user_metadata' THEN 'From migration 014'
        WHEN table_name = 'conversation_summaries' THEN 'From migration 013'
    END as from_migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('test_user_type', 'test_expires_at', 'test_user_metadata'))
    OR table_name = 'conversation_summaries'
  )
ORDER BY table_name, column_name;