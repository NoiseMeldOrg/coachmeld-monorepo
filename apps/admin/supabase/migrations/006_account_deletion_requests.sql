-- Create account_deletion_requests table (matching CoachMeld mobile app structure)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_requested_at ON account_deletion_requests(requested_at);

-- Create view for pending deletion requests
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

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS process_deletion_request(UUID, TEXT, TEXT);

-- Create function to process deletion requests
CREATE OR REPLACE FUNCTION process_deletion_request(
    request_id UUID,
    action TEXT,
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    current_status TEXT;
    admin_user_id UUID;
BEGIN
    -- Get the current user (admin)
    admin_user_id := auth.uid();
    
    -- Check if request exists and get current status
    SELECT status INTO current_status
    FROM account_deletion_requests
    WHERE id = request_id;
    
    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Deletion request not found';
    END IF;
    
    IF current_status NOT IN ('pending', 'processing') THEN
        RAISE EXCEPTION 'Request is not in a processable state';
    END IF;
    
    -- Process based on action
    IF action = 'complete' THEN
        UPDATE account_deletion_requests
        SET 
            status = 'completed',
            processed_at = NOW(),
            processed_by = admin_user_id,
            notes = COALESCE(admin_notes, notes)
        WHERE id = request_id;
        
        result := json_build_object(
            'success', true,
            'message', 'Deletion request marked as completed',
            'action', 'complete'
        );
        
    ELSIF action = 'cancel' THEN
        UPDATE account_deletion_requests
        SET 
            status = 'cancelled',
            processed_at = NOW(),
            processed_by = admin_user_id,
            notes = COALESCE(admin_notes, notes)
        WHERE id = request_id;
        
        result := json_build_object(
            'success', true,
            'message', 'Deletion request cancelled',
            'action', 'cancel'
        );
        
    ELSE
        RAISE EXCEPTION 'Invalid action. Must be "complete" or "cancel"';
    END IF;
    
    RETURN result;
END;
$$;

-- Create compatibility view to map account_deletion_requests to GDPR format
CREATE OR REPLACE VIEW gdpr_mobile_requests_view AS
SELECT 
    adr.id,
    adr.user_id,
    'delete'::VARCHAR(50) as request_type,
    adr.status,
    adr.requested_at,
    adr.email as requested_by,
    adr.processed_at as completed_at,
    adr.processed_by,
    adr.notes,
    NULL::TEXT as file_url,
    json_build_object(
        'deletion_reason', adr.reason,
        'source', 'mobile_app'
    ) as metadata,
    adr.requested_at as created_at,
    COALESCE(adr.processed_at, adr.requested_at) as updated_at,
    adr.requested_at + INTERVAL '30 days' as sla_deadline,
    CASE 
        WHEN adr.status IN ('completed', 'cancelled') THEN NULL
        WHEN NOW() > adr.requested_at + INTERVAL '30 days' THEN 'overdue'
        WHEN NOW() > adr.requested_at + INTERVAL '27 days' THEN 'warning'
        ELSE 'on_track'
    END as sla_status,
    false as soft_delete,
    adr.reason as deletion_reason,
    NULL::TIMESTAMP as grace_period_ends,
    adr.email as user_email,
    u.raw_user_meta_data->>'full_name' as user_full_name,
    admin.email as processed_by_email
FROM account_deletion_requests adr
LEFT JOIN auth.users u ON adr.user_id = u.id
LEFT JOIN auth.users admin ON adr.processed_by = admin.id;

-- Create function to get mobile deletion stats
CREATE OR REPLACE FUNCTION get_mobile_deletion_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*)::int,
        'pending', COUNT(*) FILTER (WHERE status = 'pending')::int,
        'processing', COUNT(*) FILTER (WHERE status = 'processing')::int,
        'completed', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')::int,
        'failed', 0::int, -- Mobile app doesn't have failed status
        'overdue', COUNT(*) FILTER (
            WHERE status IN ('pending', 'processing') 
            AND requested_at < NOW() - INTERVAL '30 days'
        )::int,
        'dueSoon', COUNT(*) FILTER (
            WHERE status IN ('pending', 'processing')
            AND requested_at < NOW() - INTERVAL '27 days'
            AND requested_at >= NOW() - INTERVAL '30 days'
        )::int
    ) INTO result
    FROM account_deletion_requests;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON account_deletion_requests TO authenticated;
GRANT SELECT ON pending_deletion_requests TO authenticated;
GRANT SELECT ON gdpr_mobile_requests_view TO authenticated;
GRANT EXECUTE ON FUNCTION process_deletion_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_mobile_deletion_stats TO authenticated;

-- Enable RLS
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin access
CREATE POLICY "Admin users can manage account deletion requests" ON account_deletion_requests
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to directly delete user (for admin use only)
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    is_admin BOOLEAN;
BEGIN
    -- Check if current user is admin
    SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can delete user accounts';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        -- User already deleted
        result := json_build_object(
            'success', true,
            'message', 'User account already deleted',
            'already_deleted', true
        );
    ELSE
        -- Delete the user (CASCADE will handle related data)
        DELETE FROM auth.users WHERE id = target_user_id;
        
        result := json_build_object(
            'success', true,
            'message', 'User account deleted successfully',
            'already_deleted', false
        );
    END IF;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account TO authenticated;