-- Verify Test User Columns Exist
-- Run this script to check if all required columns exist in the profiles table

-- 1. Check column existence and types
DO $$
DECLARE
    column_exists BOOLEAN;
    column_info RECORD;
BEGIN
    -- Check is_test_user column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_test_user'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'MISSING: is_test_user column';
        -- Add the column if missing
        EXECUTE 'ALTER TABLE profiles ADD COLUMN is_test_user BOOLEAN DEFAULT false';
        RAISE NOTICE 'ADDED: is_test_user column';
    ELSE
        RAISE NOTICE 'EXISTS: is_test_user column';
    END IF;

    -- Check test_subscriptions column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'test_subscriptions'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'MISSING: test_subscriptions column';
        -- Add the column if missing
        EXECUTE 'ALTER TABLE profiles ADD COLUMN test_subscriptions JSONB DEFAULT ''[]''::jsonb';
        RAISE NOTICE 'ADDED: test_subscriptions column';
    ELSE
        RAISE NOTICE 'EXISTS: test_subscriptions column';
    END IF;

    -- Check test_user_type column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'test_user_type'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'MISSING: test_user_type column';
        -- Add the column if missing
        EXECUTE 'ALTER TABLE profiles ADD COLUMN test_user_type TEXT DEFAULT ''none'' CHECK (test_user_type IN (''none'', ''beta'', ''partner'', ''investor'', ''internal''))';
        RAISE NOTICE 'ADDED: test_user_type column';
    ELSE
        RAISE NOTICE 'EXISTS: test_user_type column';
    END IF;

    -- Check test_expires_at column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'test_expires_at'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'MISSING: test_expires_at column';
        -- Add the column if missing
        EXECUTE 'ALTER TABLE profiles ADD COLUMN test_expires_at TIMESTAMPTZ';
        RAISE NOTICE 'ADDED: test_expires_at column';
    ELSE
        RAISE NOTICE 'EXISTS: test_expires_at column';
    END IF;

    -- Check test_user_metadata column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'test_user_metadata'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'MISSING: test_user_metadata column';
        -- Add the column if missing
        EXECUTE 'ALTER TABLE profiles ADD COLUMN test_user_metadata JSONB DEFAULT ''{}''::jsonb';
        RAISE NOTICE 'ADDED: test_user_metadata column';
    ELSE
        RAISE NOTICE 'EXISTS: test_user_metadata column';
    END IF;
    
    RAISE NOTICE 'Column verification complete';
END $$;

-- 2. Display current column structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
    'is_test_user',
    'test_subscriptions',
    'test_user_type',
    'test_expires_at',
    'test_user_metadata'
)
ORDER BY ordinal_position;