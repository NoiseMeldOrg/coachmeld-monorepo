-- Migration: Fix Duplicate Email Constraint
-- Description: Removes duplicate unique constraint on email column that may cause signup issues

-- Check current constraints before making changes
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Count how many unique constraints exist on the email column
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
    AND contype = 'u'
    AND conname IN ('profiles_email_key', 'profiles_email_unique');
    
    RAISE NOTICE 'Found % unique constraints on profiles.email', constraint_count;
    
    -- If we have both constraints, drop the older one
    IF constraint_count > 1 THEN
        -- Drop the non-deferrable constraint, keep the deferrable one
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'profiles_email_key' 
            AND conrelid = 'profiles'::regclass
        ) THEN
            ALTER TABLE profiles DROP CONSTRAINT profiles_email_key;
            RAISE NOTICE 'Dropped profiles_email_key constraint';
        END IF;
    END IF;
END $$;

-- Ensure we have exactly one unique constraint on email
DO $$
BEGIN
    -- Check if any unique constraint exists on email
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND contype = 'u' 
        AND conname = 'profiles_email_unique'
    ) THEN
        -- Add the deferrable constraint if it doesn't exist
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email) DEFERRABLE INITIALLY DEFERRED;
        RAISE NOTICE 'Added profiles_email_unique constraint';
    END IF;
END $$;

-- Update the handle_new_user function to better handle constraint violations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_id UUID;
    existing_user_id UUID;
BEGIN
    -- Debug logging
    RAISE NOTICE 'handle_new_user triggered for email: %, id: %', NEW.email, NEW.id;
    
    -- Check if a profile already exists with this email
    SELECT id INTO existing_profile_id 
    FROM profiles 
    WHERE email = NEW.email
    LIMIT 1;
    
    IF existing_profile_id IS NOT NULL THEN
        -- Check if this profile has a corresponding auth user
        SELECT id INTO existing_user_id 
        FROM auth.users 
        WHERE id = existing_profile_id;
        
        IF existing_user_id IS NULL THEN
            -- Orphaned profile, safe to delete
            DELETE FROM profiles WHERE id = existing_profile_id;
            RAISE NOTICE 'Deleted orphaned profile % for email %', existing_profile_id, NEW.email;
        ELSE
            -- Active profile exists, this is an error condition
            RAISE EXCEPTION 'Profile already exists for email % with user %', NEW.email, existing_user_id;
        END IF;
    END IF;
    
    -- Create the profile
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Profile created successfully for %', NEW.email;
    RETURN NEW;
    
EXCEPTION
    WHEN unique_violation THEN
        -- This should not happen if our cleanup above worked
        RAISE WARNING 'Unique violation for email % - attempting cleanup', NEW.email;
        
        -- Try to clean up and retry
        DELETE FROM profiles 
        WHERE email = NEW.email 
        AND id != NEW.id
        AND id NOT IN (SELECT id FROM auth.users);
        
        -- Try one more time
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            updated_at = NOW();
        
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to check for any auth-level issues
CREATE OR REPLACE FUNCTION public.check_auth_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '{}';
    trigger_count INTEGER;
    identity_provider_count INTEGER;
BEGIN
    -- Count triggers on auth.users
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass;
    
    -- Check identity providers (if accessible)
    BEGIN
        SELECT COUNT(DISTINCT provider) INTO identity_provider_count
        FROM auth.identities;
    EXCEPTION WHEN OTHERS THEN
        identity_provider_count := -1;
    END;
    
    result = jsonb_build_object(
        'triggers_on_auth_users', trigger_count,
        'identity_providers', identity_provider_count,
        'profile_unique_constraints', (
            SELECT COUNT(*) 
            FROM pg_constraint 
            WHERE conrelid = 'profiles'::regclass 
            AND contype = 'u'
        )
    );
    
    RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_auth_system() TO anon, authenticated, service_role;

-- Final check
DO $$
DECLARE
    auth_check JSONB;
BEGIN
    SELECT check_auth_system() INTO auth_check;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE 'Auth system check: %', auth_check;
    RAISE NOTICE '';
    RAISE NOTICE 'The duplicate email constraint has been resolved.';
    RAISE NOTICE 'Try creating the user again with email: michael@noisemeld.com';
    RAISE NOTICE '';
    RAISE NOTICE 'If it still fails, run: SELECT check_auth_system();';
    RAISE NOTICE 'Also try: SELECT test_profile_creation(''michael@noisemeld.com'');';
END $$;