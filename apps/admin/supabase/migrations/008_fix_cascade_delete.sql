-- Fix CASCADE DELETE issue on account_deletion_requests
-- When a user is deleted, we want to keep the deletion request for audit purposes

-- Drop the existing foreign key constraint
ALTER TABLE account_deletion_requests 
DROP CONSTRAINT IF EXISTS account_deletion_requests_user_id_fkey;

-- Add it back without CASCADE DELETE
ALTER TABLE account_deletion_requests
ADD CONSTRAINT account_deletion_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Also fix the processed_by constraint
ALTER TABLE account_deletion_requests 
DROP CONSTRAINT IF EXISTS account_deletion_requests_processed_by_fkey;

ALTER TABLE account_deletion_requests
ADD CONSTRAINT account_deletion_requests_processed_by_fkey 
FOREIGN KEY (processed_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Add a comment explaining why we don't cascade
COMMENT ON COLUMN account_deletion_requests.user_id IS 'Reference to the user who requested deletion. Set to NULL when user is deleted to preserve audit trail.';