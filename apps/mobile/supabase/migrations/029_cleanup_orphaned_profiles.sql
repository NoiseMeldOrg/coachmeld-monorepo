-- Migration: Cleanup Orphaned Profiles and Prevent Data Leakage
-- Description: Ensures profiles are deleted when auth users are deleted, preventing old data from appearing for new users

-- First, clean up any existing orphaned profiles (profiles without corresponding auth users)
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Create a function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete the profile when the auth user is deleted
    DELETE FROM profiles WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to delete profile when auth user is deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();

-- Update the handle_new_user function to handle email conflicts better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_id UUID;
BEGIN
    -- Check if a profile exists with this email but different ID (orphaned profile)
    SELECT id INTO existing_profile_id 
    FROM profiles 
    WHERE email = NEW.email AND id != NEW.id;
    
    IF existing_profile_id IS NOT NULL THEN
        -- Delete the orphaned profile to prevent data leakage
        DELETE FROM profiles WHERE id = existing_profile_id;
        RAISE WARNING 'Deleted orphaned profile % with email % to prevent data leakage', existing_profile_id, NEW.email;
    END IF;
    
    -- Now create the new profile
    BEGIN
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
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            updated_at = NOW();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create profile: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a unique constraint on email to prevent duplicate emails
DO $$
BEGIN
    -- Check if the unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_unique' 
        AND conrelid = 'profiles'::regclass
    ) THEN
        -- First clean up any duplicate emails (keep the one linked to an auth user)
        DELETE FROM profiles p1
        WHERE EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.email = p1.email 
            AND p2.id != p1.id
            AND p2.id IN (SELECT id FROM auth.users)
        )
        AND p1.id NOT IN (SELECT id FROM auth.users);
        
        -- Now add the unique constraint
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    END IF;
END $$;

-- Create a function to manually cleanup a user's data (for admin use)
CREATE OR REPLACE FUNCTION public.cleanup_user_data(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    profile_count INTEGER := 0;
    message_count INTEGER := 0;
    subscription_count INTEGER := 0;
BEGIN
    -- Delete profiles with this email that don't have a corresponding auth user
    DELETE FROM profiles 
    WHERE email = user_email 
    AND id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS profile_count = ROW_COUNT;
    
    -- Delete orphaned messages
    DELETE FROM messages 
    WHERE user_id IN (
        SELECT id FROM profiles 
        WHERE email = user_email 
        AND id NOT IN (SELECT id FROM auth.users)
    );
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    -- Delete orphaned subscriptions
    DELETE FROM subscriptions 
    WHERE user_id IN (
        SELECT id FROM profiles 
        WHERE email = user_email 
        AND id NOT IN (SELECT id FROM auth.users)
    );
    GET DIAGNOSTICS subscription_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'profiles_deleted', profile_count,
        'messages_deleted', message_count,
        'subscriptions_deleted', subscription_count
    );
END;
$$;

-- Grant execute permission to service role only (admin function)
GRANT EXECUTE ON FUNCTION public.cleanup_user_data(TEXT) TO service_role;

-- Log current orphaned profiles before cleanup
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM profiles p
    WHERE p.id NOT IN (SELECT id FROM auth.users);
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Found % orphaned profiles that will be cleaned up', orphan_count;
    END IF;
END $$;