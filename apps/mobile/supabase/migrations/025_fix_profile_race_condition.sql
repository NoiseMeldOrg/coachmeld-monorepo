-- Migration: Fix Profile Race Condition
-- Description: Adds function to ensure profile exists and handle race conditions during signup

-- Create a function to ensure a profile exists for a user
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN;
    result JSONB;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Profile already exists, return success
        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;
    
    -- Try to get user data from auth.users
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found in auth.users');
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
        ON CONFLICT (id) DO NOTHING;
        
        -- Check if insert was successful
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'message', 'Profile created successfully');
        ELSE
            -- Profile was created by another process (race condition resolved)
            RETURN jsonb_build_object('success', true, 'message', 'Profile created by concurrent process');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but return success if profile exists
            IF EXISTS(SELECT 1 FROM profiles WHERE id = user_id) THEN
                RETURN jsonb_build_object('success', true, 'message', 'Profile exists after error');
            ELSE
                RETURN jsonb_build_object('success', false, 'message', SQLERRM);
            END IF;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(UUID) TO authenticated;

-- Update the handle_new_user trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    result JSONB;
BEGIN
    -- Use the ensure_profile_exists function for consistency
    result := public.ensure_profile_exists(NEW.id);
    
    -- Log result for debugging
    IF NOT (result->>'success')::boolean THEN
        RAISE WARNING 'Failed to create profile in trigger: %', result->>'message';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (drop and recreate to ensure it's properly attached)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add an index to improve profile lookup performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Ensure all existing users have profiles (cleanup)
DO $$
DECLARE
    user_record RECORD;
    result JSONB;
BEGIN
    FOR user_record IN SELECT id FROM auth.users WHERE id NOT IN (SELECT id FROM profiles)
    LOOP
        result := public.ensure_profile_exists(user_record.id);
        RAISE NOTICE 'Created missing profile for user %: %', user_record.id, result;
    END LOOP;
END;
$$;