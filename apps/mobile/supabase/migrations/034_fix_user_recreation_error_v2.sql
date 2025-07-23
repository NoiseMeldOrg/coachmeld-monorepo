-- Migration: Fix User Recreation Error (v2)
-- Description: Resolves "Database error saving new user" when recreating a previously deleted user
-- This version works within Supabase permission constraints

-- Create a function to check for orphaned data before user recreation
CREATE OR REPLACE FUNCTION public.check_user_cleanup_status(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '{}';
    orphaned_profile_count INTEGER := 0;
    orphaned_message_count INTEGER := 0;
    orphaned_subscription_count INTEGER := 0;
    profile_with_email_count INTEGER := 0;
BEGIN
    -- Check for orphaned profiles (profiles without corresponding auth.users)
    SELECT COUNT(*) INTO orphaned_profile_count
    FROM profiles p
    WHERE p.id NOT IN (SELECT id FROM auth.users);
    
    -- Check for profiles with the given email
    SELECT COUNT(*) INTO profile_with_email_count
    FROM profiles
    WHERE email = user_email;
    
    -- Check for orphaned messages
    SELECT COUNT(*) INTO orphaned_message_count
    FROM messages m
    WHERE m.user_id NOT IN (SELECT id FROM auth.users);
    
    -- Check for orphaned subscriptions
    SELECT COUNT(*) INTO orphaned_subscription_count
    FROM subscriptions s
    WHERE s.user_id NOT IN (SELECT id FROM auth.users);
    
    result = jsonb_build_object(
        'email', user_email,
        'profiles_with_email', profile_with_email_count,
        'orphaned_profiles', orphaned_profile_count,
        'orphaned_messages', orphaned_message_count,
        'orphaned_subscriptions', orphaned_subscription_count
    );
    
    RETURN result;
END;
$$;

-- Create a function to clean up orphaned data in our tables (not auth tables)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_user_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_profiles INTEGER := 0;
    cleaned_messages INTEGER := 0;
    cleaned_subscriptions INTEGER := 0;
    cleaned_message_limits INTEGER := 0;
    cleaned_documents INTEGER := 0;
BEGIN
    -- Clean up orphaned profiles
    DELETE FROM profiles 
    WHERE id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS cleaned_profiles = ROW_COUNT;
    
    -- Clean up orphaned messages
    DELETE FROM messages 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS cleaned_messages = ROW_COUNT;
    
    -- Clean up orphaned subscriptions
    DELETE FROM subscriptions 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS cleaned_subscriptions = ROW_COUNT;
    
    -- Clean up orphaned message_limits if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
        DELETE FROM message_limits 
        WHERE user_id NOT IN (SELECT id FROM auth.users);
        GET DIAGNOSTICS cleaned_message_limits = ROW_COUNT;
    END IF;
    
    -- Clean up orphaned user documents
    DELETE FROM document_sources 
    WHERE type = 'user_context' 
    AND (metadata->>'user_id')::uuid NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS cleaned_documents = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_profiles', cleaned_profiles,
        'cleaned_messages', cleaned_messages,
        'cleaned_subscriptions', cleaned_subscriptions,
        'cleaned_message_limits', cleaned_message_limits,
        'cleaned_documents', cleaned_documents,
        'timestamp', NOW()
    );
END;
$$;

-- Create a specific function to prepare for recreating a user with a specific email
CREATE OR REPLACE FUNCTION public.prepare_email_for_signup(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    deleted_profile_id UUID;
    deleted_count INTEGER := 0;
BEGIN
    -- First, check current status
    result = check_user_cleanup_status(user_email);
    
    -- Delete any profiles with this email that don't have a corresponding auth user
    DELETE FROM profiles 
    WHERE email = user_email 
    AND id NOT IN (SELECT id FROM auth.users)
    RETURNING id INTO deleted_profile_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        -- Also clean up related data for the deleted profile
        DELETE FROM messages WHERE user_id = deleted_profile_id;
        DELETE FROM subscriptions WHERE user_id = deleted_profile_id;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
            DELETE FROM message_limits WHERE user_id = deleted_profile_id;
        END IF;
        
        DELETE FROM document_sources 
        WHERE type = 'user_context' 
        AND (metadata->>'user_id')::uuid = deleted_profile_id;
    END IF;
    
    -- Add cleanup info to result
    result = result || jsonb_build_object(
        'profiles_cleaned', deleted_count,
        'cleanup_completed', true
    );
    
    RETURN result;
END;
$$;

-- Improve the profile creation trigger to handle email conflicts better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_id UUID;
BEGIN
    -- First check if a profile exists with this email but different ID
    SELECT id INTO existing_profile_id 
    FROM profiles 
    WHERE email = NEW.email 
    AND id != NEW.id
    LIMIT 1;
    
    IF existing_profile_id IS NOT NULL THEN
        -- Check if this profile belongs to an existing user
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = existing_profile_id) THEN
            -- It's an orphaned profile, delete it
            DELETE FROM profiles WHERE id = existing_profile_id;
            RAISE NOTICE 'Deleted orphaned profile % with email %', existing_profile_id, NEW.email;
        ELSE
            -- There's an active user with this email, this shouldn't happen
            RAISE WARNING 'Active user already exists with email %', NEW.email;
        END IF;
    END IF;
    
    -- Now create or update the profile
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW()
    -- Handle email unique constraint violation
    ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        updated_at = NOW()
        WHERE profiles.id NOT IN (SELECT id FROM auth.users); -- Only update if it's orphaned
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If we still get a unique violation, try to clean up and retry
        PERFORM prepare_email_for_signup(NEW.email);
        
        -- Try one more time
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
        
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions for the utility functions
GRANT EXECUTE ON FUNCTION public.check_user_cleanup_status(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_user_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_email_for_signup(TEXT) TO anon, authenticated, service_role;

-- Run initial cleanup
SELECT cleanup_orphaned_user_data();

-- Log completion
DO $$
DECLARE
    cleanup_result JSONB;
BEGIN
    cleanup_result = cleanup_orphaned_user_data();
    RAISE NOTICE 'Migration completed. Initial cleanup result: %', cleanup_result;
    RAISE NOTICE '';
    RAISE NOTICE 'To prepare an email for signup, run: SELECT prepare_email_for_signup(''user@email.com'');';
    RAISE NOTICE 'To check cleanup status, run: SELECT check_user_cleanup_status(''user@email.com'');';
    RAISE NOTICE 'To clean all orphaned data, run: SELECT cleanup_orphaned_user_data();';
END $$;