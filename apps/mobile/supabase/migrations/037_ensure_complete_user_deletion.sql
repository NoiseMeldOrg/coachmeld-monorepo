-- Migration: Ensure Complete User Deletion
-- Description: Ensures all user data is completely removed when a user is deleted

-- First, let's check and fix all foreign key constraints to ensure CASCADE DELETE
DO $$
BEGIN
    -- Ensure profiles table has CASCADE DELETE
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Ensure messages table has CASCADE DELETE
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
    ALTER TABLE messages 
        ADD CONSTRAINT messages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Ensure subscriptions table has CASCADE DELETE
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
    ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Ensure message_limits table has CASCADE DELETE (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
        ALTER TABLE message_limits DROP CONSTRAINT IF EXISTS message_limits_user_id_fkey;
        ALTER TABLE message_limits 
            ADD CONSTRAINT message_limits_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    -- Ensure consent_records table has CASCADE DELETE (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_records') THEN
        ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;
        ALTER TABLE consent_records 
            ADD CONSTRAINT consent_records_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    -- Ensure data_deletion_requests table has CASCADE DELETE (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_deletion_requests') THEN
        ALTER TABLE data_deletion_requests DROP CONSTRAINT IF EXISTS data_deletion_requests_user_id_fkey;
        ALTER TABLE data_deletion_requests 
            ADD CONSTRAINT data_deletion_requests_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    RAISE NOTICE 'All foreign key constraints updated to CASCADE DELETE';
END $$;

-- Create a function to completely delete a user and all their data
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_data JSONB := '{}';
    profile_deleted BOOLEAN := false;
    messages_deleted INTEGER := 0;
    subscriptions_deleted INTEGER := 0;
    documents_deleted INTEGER := 0;
    user_email TEXT;
BEGIN
    -- Get user email before deletion
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    
    IF user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Delete user documents
    DELETE FROM document_sources 
    WHERE type = 'user_context' 
    AND (metadata->>'user_id')::uuid = user_id;
    GET DIAGNOSTICS documents_deleted = ROW_COUNT;

    -- Delete messages
    DELETE FROM messages WHERE user_id = user_id;
    GET DIAGNOSTICS messages_deleted = ROW_COUNT;

    -- Delete subscriptions
    DELETE FROM subscriptions WHERE user_id = user_id;
    GET DIAGNOSTICS subscriptions_deleted = ROW_COUNT;

    -- Delete message limits if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
        DELETE FROM message_limits WHERE user_id = user_id;
    END IF;

    -- Delete consent records if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_records') THEN
        DELETE FROM consent_records WHERE user_id = user_id;
    END IF;

    -- Delete profile
    DELETE FROM profiles WHERE id = user_id;
    profile_deleted := FOUND;

    -- The auth.users deletion will be handled by the caller
    -- We can't delete from auth.users directly due to RLS

    deleted_data = jsonb_build_object(
        'success', true,
        'user_id', user_id,
        'email', user_email,
        'profile_deleted', profile_deleted,
        'messages_deleted', messages_deleted,
        'subscriptions_deleted', subscriptions_deleted,
        'documents_deleted', documents_deleted
    );

    RETURN deleted_data;
END;
$$;

-- Create a function for users to request their own account deletion
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    deletion_result JSONB;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Delete all user data first
    deletion_result := delete_user_completely(current_user_id);
    
    -- Note: The actual auth.users deletion will need to be done through Supabase Auth API
    -- This function prepares all the data deletion
    
    RETURN deletion_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- Create an AFTER DELETE trigger to log deletions
CREATE OR REPLACE FUNCTION public.log_user_deletion_complete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'User % (email: %) has been completely deleted', OLD.id, OLD.email;
    
    -- Clean up any remaining orphaned data that might have been missed
    DELETE FROM document_sources 
    WHERE type = 'user_context' 
    AND (metadata->>'user_id')::uuid = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS after_auth_user_deleted ON auth.users;
CREATE TRIGGER after_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.log_user_deletion_complete();

-- Create a diagnostic function to check what data exists for a user
CREATE OR REPLACE FUNCTION public.check_user_data(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '{}';
    user_id UUID;
    profile_data JSONB;
    message_count INTEGER := 0;
    subscription_count INTEGER := 0;
    document_count INTEGER := 0;
BEGIN
    -- Find user ID by email
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        -- Check if profile exists without auth user
        SELECT id INTO user_id FROM profiles WHERE email = user_email LIMIT 1;
        
        IF user_id IS NOT NULL THEN
            result = jsonb_build_object(
                'status', 'orphaned_profile',
                'profile_id', user_id,
                'message', 'Profile exists without auth user'
            );
        ELSE
            result = jsonb_build_object(
                'status', 'no_data',
                'message', 'No user or profile found with this email'
            );
        END IF;
        RETURN result;
    END IF;
    
    -- Get profile data
    SELECT row_to_json(p.*) INTO profile_data
    FROM profiles p
    WHERE p.id = user_id;
    
    -- Count related data
    SELECT COUNT(*) INTO message_count FROM messages WHERE user_id = user_id;
    SELECT COUNT(*) INTO subscription_count FROM subscriptions WHERE user_id = user_id;
    SELECT COUNT(*) INTO document_count 
    FROM document_sources 
    WHERE type = 'user_context' 
    AND (metadata->>'user_id')::uuid = user_id;
    
    result = jsonb_build_object(
        'status', 'active_user',
        'user_id', user_id,
        'email', user_email,
        'profile', profile_data,
        'message_count', message_count,
        'subscription_count', subscription_count,
        'document_count', document_count
    );
    
    RETURN result;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.check_user_data(TEXT) TO anon, authenticated, service_role;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== User Deletion System Updated ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '1. delete_user_completely(user_id) - Deletes all user data';
    RAISE NOTICE '2. request_account_deletion() - For authenticated users to delete their account';
    RAISE NOTICE '3. check_user_data(email) - Check what data exists for a user';
    RAISE NOTICE '';
    RAISE NOTICE 'All tables now have CASCADE DELETE properly configured.';
    RAISE NOTICE '';
    RAISE NOTICE 'To check user data: SELECT check_user_data(''email@example.com'');';
END $$;