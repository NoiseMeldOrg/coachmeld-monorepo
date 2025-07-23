-- Migration: Remove AFTER DELETE Trigger on auth.users
-- Description: Removes the trigger that might be interfering with Supabase's deletion process

-- Drop the AFTER DELETE trigger that might be causing issues
DROP TRIGGER IF EXISTS after_auth_user_deleted ON auth.users;

-- Drop the associated function
DROP FUNCTION IF EXISTS public.log_user_deletion_complete();

-- Also drop the older version if it exists
DROP FUNCTION IF EXISTS public.log_user_deletion();

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Removed AFTER DELETE trigger from auth.users ===';
    RAISE NOTICE '';
    RAISE NOTICE 'This trigger was likely interfering with Supabase Authentication dashboard deletions.';
    RAISE NOTICE 'User deletion through the Supabase dashboard should work again.';
    RAISE NOTICE 'CASCADE DELETE will still handle all data cleanup automatically.';
    RAISE NOTICE '';
END $$;