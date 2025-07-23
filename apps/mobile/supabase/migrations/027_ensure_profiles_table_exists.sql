-- Migration: Ensure Profiles Table Exists
-- Description: Emergency migration to create profiles table if it doesn't exist

-- Check if profiles table exists, create it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE 'Creating profiles table...';
        
        -- Create the profiles table with all columns
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            age INTEGER,
            gender TEXT CHECK (gender IN ('male', 'female', 'other')),
            height_cm NUMERIC,
            weight_kg NUMERIC,
            goal_weight_kg NUMERIC,
            goal TEXT,
            health_conditions TEXT,
            carnivore_experience TEXT,
            units TEXT DEFAULT 'imperial' CHECK (units IN ('imperial', 'metric')),
            activity_level TEXT DEFAULT 'moderately_active',
            diet_type TEXT,
            -- Test user fields
            is_test_user BOOLEAN DEFAULT false,
            test_subscriptions TEXT[] DEFAULT '{}',
            test_user_type TEXT DEFAULT 'none',
            test_expires_at TIMESTAMPTZ,
            test_user_metadata JSONB DEFAULT '{}',
            -- GDPR fields
            gdpr_consent_date TIMESTAMPTZ,
            data_processing_consent BOOLEAN DEFAULT false,
            marketing_consent BOOLEAN DEFAULT false,
            analytics_consent BOOLEAN DEFAULT false,
            -- Stripe field
            stripe_customer_id TEXT,
            -- Timestamps
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_profiles_email ON profiles(email);
        CREATE INDEX idx_profiles_id ON profiles(id);
        
        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);
        
        CREATE POLICY "Users can create own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
        
        CREATE POLICY "Service role has full access" ON profiles
            FOR ALL USING (auth.role() = 'service_role');
        
        RAISE NOTICE 'Profiles table created successfully';
    ELSE
        RAISE NOTICE 'Profiles table already exists';
        
        -- Ensure all columns exist
        -- Test user columns
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
        
        -- GDPR columns
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
        
        -- Other columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
            ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'goal_weight_kg') THEN
            ALTER TABLE profiles ADD COLUMN goal_weight_kg NUMERIC;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'activity_level') THEN
            ALTER TABLE profiles ADD COLUMN activity_level TEXT DEFAULT 'moderately_active';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'diet_type') THEN
            ALTER TABLE profiles ADD COLUMN diet_type TEXT;
        END IF;
    END IF;
END $$;

-- Recreate the trigger function (in case it's referencing non-existent table)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple insert with minimal error handling
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
            updated_at = NOW();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create profile: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Create profiles for any existing users
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', ''),
    COALESCE(created_at, NOW()),
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT DO NOTHING;