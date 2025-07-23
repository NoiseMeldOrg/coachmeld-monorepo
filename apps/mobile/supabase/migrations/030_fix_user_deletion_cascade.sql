-- Migration: Fix User Deletion Cascade
-- Description: Ensures users can be deleted by adding cascade deletion to all foreign key constraints

-- First, drop existing foreign key constraints and recreate with CASCADE
DO $$
BEGIN
    -- Fix profiles table foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
    
    -- Add cascade delete for profiles
    ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Fix messages table foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_user_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_user_id_fkey;
    END IF;
    
    -- Add cascade delete for messages
    ALTER TABLE messages 
        ADD CONSTRAINT messages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Fix subscriptions table foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_user_id_fkey' 
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_user_id_fkey;
    END IF;
    
    -- Add cascade delete for subscriptions
    ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

    -- Fix message_limits table foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_limits_user_id_fkey' 
        AND table_name = 'message_limits'
    ) THEN
        ALTER TABLE message_limits DROP CONSTRAINT message_limits_user_id_fkey;
    END IF;
    
    -- Add cascade delete for message_limits
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_limits') THEN
        ALTER TABLE message_limits 
            ADD CONSTRAINT message_limits_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    -- Fix data_deletion_requests table foreign key if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_deletion_requests') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'data_deletion_requests_user_id_fkey' 
            AND table_name = 'data_deletion_requests'
        ) THEN
            ALTER TABLE data_deletion_requests DROP CONSTRAINT data_deletion_requests_user_id_fkey;
        END IF;
        
        ALTER TABLE data_deletion_requests 
            ADD CONSTRAINT data_deletion_requests_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    -- Fix consent_records table foreign key if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_records') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'consent_records_user_id_fkey' 
            AND table_name = 'consent_records'
        ) THEN
            ALTER TABLE consent_records DROP CONSTRAINT consent_records_user_id_fkey;
        END IF;
        
        ALTER TABLE consent_records 
            ADD CONSTRAINT consent_records_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;

    -- Fix any user_context documents in document_sources
    -- These use metadata->>'user_id' so we need a different approach
    -- Create a function to clean these up on user deletion
    CREATE OR REPLACE FUNCTION public.cleanup_user_documents()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Delete document sources that belong to the deleted user
        DELETE FROM document_sources 
        WHERE metadata->>'user_id' = OLD.id::text 
        AND type = 'user_context';
        
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger to cleanup user documents
    DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_documents ON auth.users;
    CREATE TRIGGER on_auth_user_deleted_cleanup_documents
        BEFORE DELETE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_documents();

END $$;

-- Now the deletion trigger from migration 029 will work properly
-- because all related records will be cascade deleted first

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'User deletion cascade constraints have been added successfully';
END $$;