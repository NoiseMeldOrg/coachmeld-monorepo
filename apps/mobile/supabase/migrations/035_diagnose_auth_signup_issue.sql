-- Migration: Diagnose Auth Signup Issue
-- Description: Helps identify why "Database error saving new user" occurs during signup

-- Create a diagnostic function to check auth-related issues
CREATE OR REPLACE FUNCTION public.diagnose_signup_issue(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '{}';
    auth_user_exists BOOLEAN := false;
    profile_exists BOOLEAN := false;
    email_in_identities INTEGER := 0;
    profile_count_with_email INTEGER := 0;
    auth_user_count_with_email INTEGER := 0;
    trigger_exists BOOLEAN := false;
    trigger_enabled BOOLEAN := false;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = user_email) INTO auth_user_exists;
    
    -- Count how many auth users have this email (should be 0 or 1)
    SELECT COUNT(*) INTO auth_user_count_with_email FROM auth.users WHERE email = user_email;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE email = user_email) INTO profile_exists;
    
    -- Count profiles with this email
    SELECT COUNT(*) INTO profile_count_with_email FROM profiles WHERE email = user_email;
    
    -- Check if email exists in identities (requires elevated permissions, might fail)
    BEGIN
        SELECT COUNT(*) INTO email_in_identities 
        FROM auth.identities 
        WHERE email = user_email;
    EXCEPTION WHEN OTHERS THEN
        email_in_identities := -1; -- -1 indicates we couldn't check
    END;
    
    -- Check if the trigger exists and is enabled
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) INTO trigger_exists;
    
    SELECT tgenabled != 'D' INTO trigger_enabled
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass;
    
    -- Build result
    result = jsonb_build_object(
        'email', user_email,
        'auth_user_exists', auth_user_exists,
        'auth_user_count', auth_user_count_with_email,
        'profile_exists', profile_exists,
        'profile_count', profile_count_with_email,
        'identities_count', CASE WHEN email_in_identities = -1 THEN 'unable_to_check' ELSE email_in_identities::text END,
        'trigger_exists', trigger_exists,
        'trigger_enabled', trigger_enabled,
        'diagnosis', CASE
            WHEN auth_user_exists THEN 'User already exists in auth.users'
            WHEN profile_exists AND NOT auth_user_exists THEN 'Orphaned profile exists without auth user'
            WHEN email_in_identities > 0 THEN 'Email exists in auth.identities'
            ELSE 'No obvious conflicts found'
        END
    );
    
    RETURN result;
END;
$$;

-- Create a function to show all constraints on profiles table
CREATE OR REPLACE FUNCTION public.show_profile_constraints()
RETURNS TABLE (
    constraint_name TEXT,
    constraint_type TEXT,
    constraint_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.conname::TEXT as constraint_name,
        CASE c.contype
            WHEN 'c' THEN 'CHECK'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'u' THEN 'UNIQUE'
            ELSE c.contype::TEXT
        END as constraint_type,
        pg_get_constraintdef(c.oid)::TEXT as constraint_definition
    FROM pg_constraint c
    WHERE c.conrelid = 'profiles'::regclass
    ORDER BY c.contype, c.conname;
END;
$$;

-- Create a function to test profile creation directly
CREATE OR REPLACE FUNCTION public.test_profile_creation(test_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_id UUID := gen_random_uuid();
    result JSONB;
    error_message TEXT;
BEGIN
    -- Try to create a test profile directly
    BEGIN
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (test_id, test_email, 'Test User', NOW(), NOW());
        
        -- If successful, delete it immediately
        DELETE FROM profiles WHERE id = test_id;
        
        result = jsonb_build_object(
            'success', true,
            'message', 'Profile creation test successful',
            'test_id', test_id
        );
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        result = jsonb_build_object(
            'success', false,
            'error', error_message,
            'sqlstate', SQLSTATE
        );
    END;
    
    RETURN result;
END;
$$;

-- Create a function to check RLS policies
CREATE OR REPLACE FUNCTION public.check_profile_policies()
RETURNS TABLE (
    policy_name TEXT,
    command TEXT,
    permissive TEXT,
    roles TEXT[],
    qual TEXT,
    with_check TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pol.polname::TEXT,
        CASE pol.polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
            ELSE pol.polcmd::TEXT
        END,
        CASE pol.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles))::TEXT[],
        pg_get_expr(pol.polqual, pol.polrelid)::TEXT,
        pg_get_expr(pol.polwithcheck, pol.polrelid)::TEXT
    FROM pg_policy pol
    WHERE pol.polrelid = 'profiles'::regclass;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.diagnose_signup_issue(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.show_profile_constraints() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.test_profile_creation(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_profile_policies() TO anon, authenticated, service_role;

-- Run diagnostics and display results
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Diagnostic Functions Created ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Run these commands to diagnose the signup issue:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Check for conflicts with specific email:';
    RAISE NOTICE '   SELECT diagnose_signup_issue(''user@email.com'');';
    RAISE NOTICE '';
    RAISE NOTICE '2. Show all constraints on profiles table:';
    RAISE NOTICE '   SELECT * FROM show_profile_constraints();';
    RAISE NOTICE '';
    RAISE NOTICE '3. Test direct profile creation:';
    RAISE NOTICE '   SELECT test_profile_creation(''test@email.com'');';
    RAISE NOTICE '';
    RAISE NOTICE '4. Check RLS policies on profiles:';
    RAISE NOTICE '   SELECT * FROM check_profile_policies();';
    RAISE NOTICE '';
END $$;