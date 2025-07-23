-- Migration: Fix Deletion Trigger Order
-- Description: Removes the BEFORE DELETE trigger that's preventing user deletion and relies on CASCADE instead

-- Drop the problematic BEFORE DELETE trigger from migration 029
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_deletion();

-- Also drop the document cleanup trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_documents ON auth.users;
DROP FUNCTION IF EXISTS public.cleanup_user_documents();

-- Create an AFTER DELETE trigger instead (runs after the user is deleted)
-- This is only for logging/cleanup of orphaned data that CASCADE might miss
CREATE OR REPLACE FUNCTION public.log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the deletion (optional)
    RAISE NOTICE 'User % with email % has been deleted', OLD.id, OLD.email;
    
    -- Clean up any orphaned data that CASCADE might have missed
    -- This runs AFTER deletion so it won't block the delete operation
    
    -- Clean up document_sources with user_id in metadata
    DELETE FROM document_sources 
    WHERE metadata->>'user_id' = OLD.id::text;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create AFTER DELETE trigger for cleanup
CREATE TRIGGER after_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.log_user_deletion();

-- Ensure all foreign keys have CASCADE (this is safe to run multiple times)
DO $$
BEGIN
    -- Fix profiles table foreign key
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Fix messages table foreign key
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
    ALTER TABLE messages 
        ADD CONSTRAINT messages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Fix subscriptions table foreign key
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
    ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Fix message_limits table foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
        ALTER TABLE message_limits DROP CONSTRAINT IF EXISTS message_limits_user_id_fkey;
        ALTER TABLE message_limits 
            ADD CONSTRAINT message_limits_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    RAISE NOTICE 'User deletion should now work properly with CASCADE deletion';
END $$;