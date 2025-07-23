-- Migration: Add Account Deletion Request Table (Fixed)
-- Description: Creates a table to track user deletion requests for admin processing (with existence checks)

-- Create table for deletion requests if it doesn't exist
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'account_deletion_requests' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create own deletion request" ON account_deletion_requests;
DROP POLICY IF EXISTS "Users can view own deletion requests" ON account_deletion_requests;
DROP POLICY IF EXISTS "Service role has full access to deletion requests" ON account_deletion_requests;

-- Create policies
CREATE POLICY "Users can create own deletion request" ON account_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion requests" ON account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to deletion requests" ON account_deletion_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Drop function if exists and recreate
DROP FUNCTION IF EXISTS public.submit_deletion_request(TEXT);

-- Create function to submit deletion request
CREATE OR REPLACE FUNCTION public.submit_deletion_request(deletion_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    request_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get user email
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Check if there's already a pending request
    IF EXISTS (
        SELECT 1 FROM account_deletion_requests 
        WHERE user_id = current_user_id 
        AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A deletion request is already pending'
        );
    END IF;
    
    -- Create deletion request
    INSERT INTO account_deletion_requests (user_id, email, reason)
    VALUES (current_user_id, current_user_email, deletion_reason)
    RETURNING id INTO request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'request_id', request_id,
        'message', 'Deletion request submitted successfully'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.submit_deletion_request(TEXT) TO authenticated;

-- Drop function if exists and recreate
DROP FUNCTION IF EXISTS public.process_deletion_request(UUID, TEXT, TEXT);

-- Create function for admins to process deletion requests
CREATE OR REPLACE FUNCTION public.process_deletion_request(
    request_id UUID,
    action TEXT, -- 'complete' or 'cancel'
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    current_status TEXT;
BEGIN
    -- Get the request details
    SELECT user_id, status INTO target_user_id, current_status
    FROM account_deletion_requests
    WHERE id = request_id;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found'
        );
    END IF;
    
    IF current_status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request already processed'
        );
    END IF;
    
    -- Update the request
    UPDATE account_deletion_requests
    SET 
        status = CASE WHEN action = 'complete' THEN 'completed' ELSE 'cancelled' END,
        processed_at = NOW(),
        processed_by = auth.uid(),
        notes = admin_notes
    WHERE id = request_id;
    
    -- If completing, delete all user data (CASCADE will handle it)
    IF action = 'complete' THEN
        -- The actual deletion should be done through Supabase dashboard or admin API
        -- This just marks the request as ready for deletion
        NULL;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', action,
        'request_id', request_id
    );
END;
$$;

-- Grant execute permission only to service role
GRANT EXECUTE ON FUNCTION public.process_deletion_request(UUID, TEXT, TEXT) TO service_role;

-- Drop view if exists and recreate
DROP VIEW IF EXISTS public.pending_deletion_requests;

-- Create view for pending deletion requests (for admin dashboard)
CREATE OR REPLACE VIEW public.pending_deletion_requests AS
SELECT 
    id,
    user_id,
    email,
    reason,
    requested_at,
    EXTRACT(EPOCH FROM (NOW() - requested_at))/3600 AS hours_pending
FROM account_deletion_requests
WHERE status = 'pending'
ORDER BY requested_at;

-- Grant access to the view
GRANT SELECT ON public.pending_deletion_requests TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Account Deletion Request System Created/Updated ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now submit deletion requests that admins can review.';
    RAISE NOTICE 'To submit a request: SELECT submit_deletion_request(''optional reason'');';
    RAISE NOTICE 'To view pending requests: SELECT * FROM pending_deletion_requests;';
    RAISE NOTICE '';
END $$;