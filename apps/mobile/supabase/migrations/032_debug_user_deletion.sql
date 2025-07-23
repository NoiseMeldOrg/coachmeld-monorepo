-- Migration: Debug and Fix User Deletion
-- Description: Identifies and fixes what's blocking user deletion

-- First, let's check what triggers exist on auth.users
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE 'Checking triggers on auth.users table:';
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_timing, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
        AND event_object_schema = 'auth'
    LOOP
        RAISE NOTICE 'Trigger: %, Event: %, Timing: %, Action: %', 
            trigger_record.trigger_name, 
            trigger_record.event_manipulation,
            trigger_record.action_timing,
            trigger_record.action_statement;
    END LOOP;
END $$;

-- Drop ALL delete-related triggers on auth.users to reset to clean state
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS after_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS before_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_documents ON auth.users;

-- Check if there are any other constraints that might be blocking deletion
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE 'Checking foreign key constraints referencing auth.users:';
    FOR constraint_record IN 
        SELECT
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
            AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth'
    LOOP
        RAISE NOTICE 'Table %.% (%) references auth.users with delete rule: %', 
            constraint_record.table_schema,
            constraint_record.table_name, 
            constraint_record.constraint_name,
            constraint_record.delete_rule;
            
        -- If it's not CASCADE, fix it
        IF constraint_record.delete_rule != 'CASCADE' THEN
            RAISE NOTICE 'Fixing constraint % to use CASCADE', constraint_record.constraint_name;
            EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                constraint_record.table_schema,
                constraint_record.table_name,
                constraint_record.constraint_name);
            EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
                constraint_record.table_schema,
                constraint_record.table_name,
                constraint_record.constraint_name,
                constraint_record.column_name);
        END IF;
    END LOOP;
END $$;

-- Also check for any policies that might be interfering
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Checking RLS policies on profiles table:';
    FOR policy_record IN 
        SELECT polname, polcmd 
        FROM pg_policy 
        WHERE polrelid = 'profiles'::regclass
    LOOP
        RAISE NOTICE 'Policy: %, Command: %', policy_record.polname, 
            CASE policy_record.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
            END;
    END LOOP;
END $$;

-- Temporarily remove the email unique constraint if it exists
-- This might be preventing deletion in some edge cases
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- Make sure the handle_new_user function doesn't interfere with deletions
-- by checking if the user still exists before doing anything
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if this is truly a new user (not a deletion)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add back the email constraint but make it DEFERRABLE
-- This allows the constraint to be checked at the end of the transaction
ALTER TABLE profiles 
    ADD CONSTRAINT profiles_email_unique 
    UNIQUE (email) 
    DEFERRABLE INITIALLY DEFERRED;

-- Final notice
DO $$
BEGIN
    RAISE NOTICE 'User deletion debugging and fixes complete';
END $$;