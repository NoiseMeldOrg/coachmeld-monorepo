# User Deletion System Documentation

## Overview

The CoachMeld app implements a comprehensive user deletion system that ensures complete data removal while maintaining compliance with privacy regulations (GDPR, CCPA).

## System Components

### 1. User-Initiated Deletion Request

Users can request account deletion through the app:
- Navigate to Settings (Profile tab)
- Scroll to Account section
- Tap "Delete Account"
- Confirm deletion in the dialog

### 2. Database Structure

#### account_deletion_requests table
```sql
- id: UUID (Primary Key)
- user_id: UUID (References auth.users with CASCADE DELETE)
- email: TEXT
- reason: TEXT
- status: TEXT ('pending', 'processing', 'completed', 'cancelled')
- requested_at: TIMESTAMP
- processed_at: TIMESTAMP
- processed_by: UUID
- notes: TEXT
```

### 3. Deletion Process Flow

1. **User requests deletion** → Creates record in `account_deletion_requests`
2. **User is signed out** → All local data is cleared
3. **Admin reviews request** → Via SQL or admin dashboard
4. **Admin deletes user** → From Supabase Authentication panel
5. **CASCADE DELETE** → Automatically removes all related data

### 4. Local Data Cleanup

When users sign out or delete their account, all local AsyncStorage data is cleared:
- `@CoachMeld:localProfile` - User profile data
- `@CoachMeld:messages` - Chat messages
- `@CoachMeld:selectedCoach` - Selected coach preference
- `@CoachMeld:theme` - Theme preference

## Database Migrations

### Key Migrations for User Deletion:
- **037_ensure_complete_user_deletion.sql** - Sets up CASCADE DELETE for all tables
- **038_add_account_deletion_table.sql** - Creates deletion request tracking
- **039_fix_all_cascade_deletes.sql** - Ensures all foreign keys use CASCADE
- **040_remove_auth_delete_trigger.sql** - Removes trigger that interfered with Supabase

## Admin Operations

### View Pending Deletion Requests
```sql
SELECT * FROM pending_deletion_requests;
```

### View All Deletion Requests
```sql
SELECT * FROM account_deletion_requests ORDER BY requested_at DESC;
```

### Delete User via SQL (if needed)
```sql
DELETE FROM auth.users WHERE email = 'user@email.com';
-- CASCADE DELETE handles all related data automatically
```

### Process Deletion Request
```sql
-- Mark request as completed (after deleting user)
SELECT process_deletion_request('request_id', 'complete', 'Admin notes here');
```

## Important Notes

1. **CASCADE DELETE** - All tables referencing auth.users have CASCADE DELETE constraints
2. **No Manual Cleanup Needed** - Deleting from auth.users automatically removes all related data
3. **Local Storage** - App clears all local data on sign out to prevent data persistence
4. **Audit Trail** - All deletion requests are logged for compliance

## Troubleshooting

### "Database error deleting user" in Supabase Dashboard
- Usually caused by triggers on auth.users table
- Solution: Run migration 040 to remove interfering triggers
- Alternative: Delete via SQL directly

### User data persists after deletion
- Issue: Local storage not cleared
- Solution: Implemented in AuthContext.signOut() to clear all @CoachMeld keys

### Finding what blocks user deletion
```sql
SELECT * FROM check_user_deletion_blockers('user_id_here');
```

## Compliance

This system provides:
- User-initiated deletion requests (GDPR Article 17 - Right to Erasure)
- Complete data removal verification
- Audit trail of all deletion requests
- Grace period for processing (24-48 hours as communicated to users)