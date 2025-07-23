-- Migration: Fix Auth Signup Issues
-- Description: Ensures profile creation trigger works properly and handles any edge cases

-- First, ensure the profiles table has all necessary columns
-- Add any missing columns with safe defaults (won't error if they already exist)
DO $$ 
BEGIN
    -- Add test user columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_test_user') THEN
        ALTER TABLE profiles ADD COLUMN is_test_user BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'test_subscriptions') THEN
        ALTER TABLE profiles ADD COLUMN test_subscriptions TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'test_user_type') THEN
        ALTER TABLE profiles ADD COLUMN test_user_type TEXT DEFAULT 'none';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'test_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN test_expires_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'test_user_metadata') THEN
        ALTER TABLE profiles ADD COLUMN test_user_metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add GDPR columns if they don't exist (from migration 020)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gdpr_consent_date') THEN
        ALTER TABLE profiles ADD COLUMN gdpr_consent_date TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'data_processing_consent') THEN
        ALTER TABLE profiles ADD COLUMN data_processing_consent BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'marketing_consent') THEN
        ALTER TABLE profiles ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'analytics_consent') THEN
        ALTER TABLE profiles ADD COLUMN analytics_consent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Recreate the handle_new_user function with ALL columns including GDPR fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the profile with ALL columns to avoid missing column errors
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    -- Test user fields
    is_test_user,
    test_subscriptions,
    test_user_type,
    test_expires_at,
    test_user_metadata,
    -- GDPR fields (added in migration 020)
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
    -- GDPR defaults (null = no consent given yet)
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
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to be more permissive during signup
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow the trigger function to bypass RLS
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Ensure auth schema permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Create any missing profiles for existing users (cleanup)
INSERT INTO public.profiles (
    id, email, full_name, 
    is_test_user, test_subscriptions, test_user_type, test_expires_at, test_user_metadata,
    gdpr_consent_date, data_processing_consent, marketing_consent, analytics_consent,
    created_at, updated_at
)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', ''),
    false,
    '{}',
    'none',
    NULL,
    '{}',
    NULL,
    false,
    false,
    false,
    NOW(),
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT DO NOTHING;