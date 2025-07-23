-- Migration: Fix Signup Email Conflicts
-- Description: Handles cases where email might exist in various tables causing signup failures

-- First, let's check what might be causing the conflict
DO $$
BEGIN
    RAISE NOTICE 'Checking for potential email conflicts...';
END $$;

-- Remove any orphaned profiles (profiles without corresponding auth.users)
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Clean up GDPR-related tables if they exist
DO $$
BEGIN
    -- Check if privacy_settings table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privacy_settings') THEN
        DELETE FROM privacy_settings WHERE user_id NOT IN (SELECT id FROM auth.users);
    END IF;
    
    -- Check if data_export_requests table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_export_requests') THEN
        DELETE FROM data_export_requests WHERE user_id NOT IN (SELECT id FROM auth.users);
    END IF;
    
    -- Check if data_deletion_requests table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_deletion_requests') THEN
        DELETE FROM data_deletion_requests WHERE user_id NOT IN (SELECT id FROM auth.users);
    END IF;
END $$;

-- Update the handle_new_user function to be even more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    result JSONB;
    existing_profile_id UUID;
BEGIN
    -- First check if a profile with this email already exists
    SELECT id INTO existing_profile_id FROM profiles WHERE email = NEW.email;
    
    IF existing_profile_id IS NOT NULL AND existing_profile_id != NEW.id THEN
        -- Delete the old profile with this email (it's orphaned)
        DELETE FROM profiles WHERE email = NEW.email AND id != NEW.id;
        RAISE WARNING 'Deleted orphaned profile with email %', NEW.email;
    END IF;
    
    -- Now try to create the profile
    BEGIN
        INSERT INTO profiles (
            id,
            email,
            full_name,
            -- Test user fields
            is_test_user,
            test_subscriptions,
            test_user_type,
            test_expires_at,
            test_user_metadata,
            -- GDPR fields
            gdpr_consent_date,
            data_processing_consent,
            marketing_consent,
            analytics_consent,
            -- Timestamps
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            -- Test user defaults
            false,
            '{}',
            'none',
            NULL,
            '{}',
            -- GDPR defaults
            NULL,
            false,
            false,
            false,
            -- Timestamps
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            updated_at = NOW();
        
        RETURN NEW;
    EXCEPTION
        WHEN unique_violation THEN
            -- If we still get a unique violation, it's likely the email
            -- Try to update the existing profile with this ID
            UPDATE profiles 
            SET email = NEW.email,
                full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
                updated_at = NOW()
            WHERE id = NEW.id;
            
            RAISE WARNING 'Updated existing profile for user % with email %', NEW.id, NEW.email;
            RETURN NEW;
        WHEN OTHERS THEN
            -- Log the specific error
            RAISE WARNING 'Error in handle_new_user: % - %', SQLERRM, SQLSTATE;
            -- Don't fail the signup
            RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also update ensure_profile_exists to handle email conflicts
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN;
    user_email TEXT;
    existing_profile_id UUID;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;
    
    -- Get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    
    IF user_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found in auth.users');
    END IF;
    
    -- Check if another profile has this email
    SELECT id INTO existing_profile_id FROM profiles WHERE email = user_email AND id != user_id;
    
    IF existing_profile_id IS NOT NULL THEN
        -- Delete the orphaned profile
        DELETE FROM profiles WHERE id = existing_profile_id;
        RAISE WARNING 'Deleted orphaned profile % with email %', existing_profile_id, user_email;
    END IF;
    
    -- Create profile with all necessary columns
    BEGIN
        INSERT INTO profiles (
            id,
            email,
            full_name,
            -- Test user fields
            is_test_user,
            test_subscriptions,
            test_user_type,
            test_expires_at,
            test_user_metadata,
            -- GDPR fields
            gdpr_consent_date,
            data_processing_consent,
            marketing_consent,
            analytics_consent,
            -- Timestamps
            created_at,
            updated_at
        )
        SELECT
            u.id,
            u.email,
            COALESCE(u.raw_user_meta_data->>'full_name', ''),
            -- Test user defaults
            false,
            '{}',
            'none',
            NULL,
            '{}',
            -- GDPR defaults
            NULL,
            false,
            false,
            false,
            -- Timestamps
            NOW(),
            NOW()
        FROM auth.users u
        WHERE u.id = user_id
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
        
        RETURN jsonb_build_object('success', true, 'message', 'Profile created successfully');
    EXCEPTION
        WHEN unique_violation THEN
            -- Email conflict - shouldn't happen after cleanup above
            RETURN jsonb_build_object('success', false, 'message', 'Email already exists: ' || SQLERRM);
        WHEN OTHERS THEN
            -- Check if profile exists after error
            IF EXISTS(SELECT 1 FROM profiles WHERE id = user_id) THEN
                RETURN jsonb_build_object('success', true, 'message', 'Profile exists after error');
            ELSE
                RETURN jsonb_build_object('success', false, 'message', SQLERRM);
            END IF;
    END;
END;
$$;

-- Add a cleanup function that can be called manually if needed
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profiles_deleted INTEGER;
    messages_deleted INTEGER;
    subscriptions_deleted INTEGER;
BEGIN
    -- Delete orphaned profiles
    DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS profiles_deleted = ROW_COUNT;
    
    -- Delete orphaned messages
    DELETE FROM messages WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS messages_deleted = ROW_COUNT;
    
    -- Delete orphaned subscriptions
    DELETE FROM subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS subscriptions_deleted = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'profiles_deleted', profiles_deleted,
        'messages_deleted', messages_deleted,
        'subscriptions_deleted', subscriptions_deleted
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_data() TO service_role;

-- Run cleanup immediately
SELECT public.cleanup_orphaned_data();