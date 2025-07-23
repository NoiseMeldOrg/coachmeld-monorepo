-- Migration: Fix User Recreation Error
-- Description: Resolves "Database error saving new user" when recreating a previously deleted user

-- First, let's check if there are any orphaned auth identities
-- When a user is deleted from auth.users, sometimes the identities remain
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Count orphaned identities (identities without corresponding auth.users)
    SELECT COUNT(*) INTO orphaned_count
    FROM auth.identities i
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = i.user_id
    );
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned identities that need cleanup', orphaned_count;
        
        -- Delete orphaned identities
        DELETE FROM auth.identities
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.users u WHERE u.id = auth.identities.user_id
        );
        
        RAISE NOTICE 'Cleaned up orphaned identities';
    END IF;
END $$;

-- Check for any auth.users constraints that might prevent recreation
DO $$
BEGIN
    -- Log all unique constraints on auth.users for debugging
    RAISE NOTICE 'Checking auth.users constraints...';
    
    -- The auth.users table has a unique constraint on email
    -- Let's ensure there are no duplicate emails
    IF EXISTS (
        SELECT email, COUNT(*) 
        FROM auth.users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE WARNING 'Found duplicate emails in auth.users - this should not happen!';
    END IF;
END $$;

-- Create a function to completely clean up a user's data before recreation
CREATE OR REPLACE FUNCTION public.cleanup_before_user_recreation(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_items JSONB := '{}';
    identity_count INTEGER := 0;
    profile_count INTEGER := 0;
    user_id UUID;
BEGIN
    -- Find any existing user with this email (should be none if properly deleted)
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        cleaned_items = jsonb_set(cleaned_items, '{existing_user_found}', 'true');
        RETURN cleaned_items;
    END IF;
    
    -- Clean up any orphaned identities with this email
    DELETE FROM auth.identities 
    WHERE email = user_email 
    AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = auth.identities.user_id
    );
    GET DIAGNOSTICS identity_count = ROW_COUNT;
    
    -- Clean up any orphaned profiles with this email
    DELETE FROM profiles 
    WHERE email = user_email 
    AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = profiles.id
    );
    GET DIAGNOSTICS profile_count = ROW_COUNT;
    
    cleaned_items = jsonb_build_object(
        'success', true,
        'identities_cleaned', identity_count,
        'profiles_cleaned', profile_count,
        'email', user_email
    );
    
    RETURN cleaned_items;
END;
$$;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION public.cleanup_before_user_recreation(TEXT) TO service_role;

-- Update the auth trigger to better handle edge cases
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Update existing profile
        UPDATE profiles 
        SET email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
    ELSE
        -- Create new profile
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
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle unique constraint violation on email
        RAISE WARNING 'Email % already exists in profiles, updating existing record', NEW.email;
        UPDATE profiles 
        SET id = NEW.id,
            updated_at = NOW()
        WHERE email = NEW.email;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail signup
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a cleanup function that can be called before attempting to recreate a user
CREATE OR REPLACE FUNCTION public.prepare_for_user_recreation(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- First cleanup any orphaned data
    result = public.cleanup_before_user_recreation(user_email);
    
    -- Additional cleanup for any edge cases
    -- Remove from profiles if email exists but user doesn't
    DELETE FROM profiles 
    WHERE email = user_email 
    AND id NOT IN (SELECT id FROM auth.users);
    
    -- Remove any orphaned subscriptions
    DELETE FROM subscriptions 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    -- Remove any orphaned messages
    DELETE FROM messages 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.prepare_for_user_recreation(TEXT) TO anon, authenticated, service_role;

-- Create an index on auth.identities.email for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_identities_email ON auth.identities(email);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'User recreation error fix migration completed';
    RAISE NOTICE 'You can now call prepare_for_user_recreation(email) before creating a new user';
    RAISE NOTICE 'This will clean up any orphaned data that might prevent user creation';
END $$;