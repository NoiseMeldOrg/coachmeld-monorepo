-- Migration: Fix All CASCADE DELETE Constraints
-- Description: Ensures ALL foreign keys referencing auth.users have CASCADE DELETE

-- First, let's identify all foreign keys that reference auth.users without CASCADE
DO $$
DECLARE
    rec RECORD;
    constraint_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking all foreign key constraints referencing auth.users...';
    
    -- Find all foreign keys referencing auth.users
    FOR rec IN 
        SELECT 
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_catalog = rc.constraint_catalog
            AND tc.constraint_schema = rc.constraint_schema
            AND tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON rc.unique_constraint_catalog = ccu.constraint_catalog
            AND rc.unique_constraint_schema = ccu.constraint_schema
            AND rc.unique_constraint_name = ccu.constraint_name
        WHERE ccu.table_schema = 'auth' 
            AND ccu.table_name = 'users'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        RAISE NOTICE 'Found non-CASCADE constraint: %.% - % (current rule: %)', 
            rec.table_schema, rec.table_name, rec.constraint_name, rec.delete_rule;
        constraint_count := constraint_count + 1;
    END LOOP;
    
    IF constraint_count = 0 THEN
        RAISE NOTICE 'All foreign key constraints already have CASCADE DELETE!';
    ELSE
        RAISE NOTICE 'Found % constraints that need CASCADE DELETE', constraint_count;
    END IF;
END $$;

-- Function to fix a specific constraint
CREATE OR REPLACE FUNCTION fix_cascade_constraint(
    p_table_name TEXT,
    p_constraint_name TEXT,
    p_column_name TEXT DEFAULT 'user_id'
)
RETURNS VOID AS $$
BEGIN
    -- Drop the existing constraint
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', p_table_name, p_constraint_name);
    
    -- Add it back with CASCADE
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE', 
        p_table_name, p_constraint_name, p_column_name);
    
    RAISE NOTICE 'Fixed CASCADE for %.%', p_table_name, p_constraint_name;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing %: %', p_constraint_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Fix known tables that might have issues
DO $$
BEGIN
    -- Fix profiles table
    PERFORM fix_cascade_constraint('profiles', 'profiles_id_fkey', 'id');
    
    -- Fix messages table
    PERFORM fix_cascade_constraint('messages', 'messages_user_id_fkey', 'user_id');
    
    -- Fix subscriptions table
    PERFORM fix_cascade_constraint('subscriptions', 'subscriptions_user_id_fkey', 'user_id');
    
    -- Fix account_deletion_requests
    PERFORM fix_cascade_constraint('account_deletion_requests', 'account_deletion_requests_user_id_fkey', 'user_id');
    PERFORM fix_cascade_constraint('account_deletion_requests', 'account_deletion_requests_processed_by_fkey', 'processed_by');
    
    -- Fix message_limits if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
        PERFORM fix_cascade_constraint('message_limits', 'message_limits_user_id_fkey', 'user_id');
    END IF;
    
    -- Fix consent_records if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_records') THEN
        PERFORM fix_cascade_constraint('consent_records', 'consent_records_user_id_fkey', 'user_id');
    END IF;
    
    -- Fix data_deletion_requests if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_deletion_requests') THEN
        PERFORM fix_cascade_constraint('data_deletion_requests', 'data_deletion_requests_user_id_fkey', 'user_id');
    END IF;
END $$;

-- Drop the temporary function
DROP FUNCTION fix_cascade_constraint(TEXT, TEXT, TEXT);

-- Create a diagnostic function to check what's blocking user deletion
CREATE OR REPLACE FUNCTION public.check_user_deletion_blockers(check_user_id UUID)
RETURNS TABLE(
    table_name TEXT,
    column_name TEXT,
    constraint_name TEXT,
    delete_rule TEXT,
    record_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH foreign_keys AS (
        SELECT 
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            tc.constraint_name,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_catalog = kcu.constraint_catalog
            AND tc.constraint_schema = kcu.constraint_schema
            AND tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_catalog = rc.constraint_catalog
            AND tc.constraint_schema = rc.constraint_schema
            AND tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON rc.unique_constraint_catalog = ccu.constraint_catalog
            AND rc.unique_constraint_schema = ccu.constraint_schema
            AND rc.unique_constraint_name = ccu.constraint_name
        WHERE ccu.table_schema = 'auth' 
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
            AND tc.constraint_type = 'FOREIGN KEY'
    )
    SELECT 
        fk.table_name::TEXT,
        fk.column_name::TEXT,
        fk.constraint_name::TEXT,
        fk.delete_rule::TEXT,
        0::BIGINT as record_count -- We'll update this with dynamic counts
    FROM foreign_keys fk
    WHERE fk.table_schema = 'public';
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.check_user_deletion_blockers(UUID) TO authenticated;

-- Check if there are any orphaned records that might block deletion
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    -- Check for orphaned profiles
    SELECT COUNT(*) INTO orphan_count
    FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Found % orphaned profiles, cleaning up...', orphan_count;
        DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
    END IF;
    
    -- Check for orphaned messages
    SELECT COUNT(*) INTO orphan_count
    FROM messages m
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Found % orphaned messages, cleaning up...', orphan_count;
        DELETE FROM messages WHERE user_id NOT IN (SELECT id FROM auth.users);
    END IF;
    
    -- Check for orphaned subscriptions
    SELECT COUNT(*) INTO orphan_count
    FROM subscriptions s
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id);
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Found % orphaned subscriptions, cleaning up...', orphan_count;
        DELETE FROM subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);
    END IF;
END $$;

-- Final check
DO $$
DECLARE
    rec RECORD;
    non_cascade_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Final CASCADE DELETE Status ===';
    
    -- Count non-CASCADE constraints
    SELECT COUNT(*) INTO non_cascade_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
        ON tc.constraint_catalog = rc.constraint_catalog
        AND tc.constraint_schema = rc.constraint_schema
        AND tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_catalog = ccu.constraint_catalog
        AND rc.unique_constraint_schema = ccu.constraint_schema
        AND rc.unique_constraint_name = ccu.constraint_name
    WHERE ccu.table_schema = 'auth' 
        AND ccu.table_name = 'users'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule != 'CASCADE';
    
    IF non_cascade_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All foreign keys now have CASCADE DELETE!';
        RAISE NOTICE 'User deletion should work properly now.';
    ELSE
        RAISE NOTICE 'WARNING: Still have % non-CASCADE constraints', non_cascade_count;
        RAISE NOTICE 'Run: SELECT * FROM check_user_deletion_blockers(''user-uuid-here'');';
    END IF;
    
    RAISE NOTICE '';
END $$;