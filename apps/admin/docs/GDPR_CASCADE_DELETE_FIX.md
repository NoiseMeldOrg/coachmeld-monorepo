# GDPR Deletion Request CASCADE DELETE Fix

## Problem

When manually deleting a user from Supabase Authentication, the `account_deletion_requests` record was being automatically deleted due to a CASCADE DELETE constraint on the foreign key. This caused the "Confirm Deletion Complete" button to fail with "mobile deletion request not found" error.

## Root Cause

The `account_deletion_requests` table was created with:
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
```

This means when a user is deleted from `auth.users`, any related records in `account_deletion_requests` are automatically deleted as well.

## Solution

Migration `008_fix_cascade_delete.sql` changes the foreign key constraint to:
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

This preserves the deletion request records for audit purposes, setting the `user_id` to NULL when the user is deleted.

## How to Apply the Fix

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration: `supabase/migrations/008_fix_cascade_delete.sql`
4. Verify the constraint has been updated

## Testing the Fix

1. Create a deletion request in the admin tool
2. Click "Process Deletion Request"
3. Manually delete the user in Supabase Authentication
4. Click "Confirm Deletion Complete"
5. The request should now be marked as completed successfully

## Why This Matters

- **Audit Trail**: Deletion requests must be preserved for GDPR compliance
- **Workflow Integrity**: The two-step deletion process requires the request to exist
- **Data Integrity**: Historical records should not be lost when users are deleted

## Related Files

- `/supabase/migrations/008_fix_cascade_delete.sql` - The migration that fixes the issue
- `/app/api/gdpr/delete/route.ts` - The API endpoint that processes deletions
- `/components/gdpr/mobile-deletion-dialog.tsx` - The UI component for deletion workflow