# Test User Integration Debugging Guide

## Issues Identified

### 1. **Database Column Mismatch**
The test user system expects the following columns in the `profiles` table:
- `is_test_user` (BOOLEAN) - Added in migration 002
- `test_subscriptions` (JSONB) - Added in migration 002
- `test_user_type` (TEXT) - Added in migration 005
- `test_expires_at` (TIMESTAMPTZ) - Added in migration 005
- `test_user_metadata` (JSONB) - Added in migration 002 and 005

**Potential Issue**: Migrations may not have run in the correct order or some columns might be missing.

### 2. **Profile Creation Timing**
The signup flow:
1. Creates a Supabase auth user
2. Creates a profile record
3. Attempts to update the profile for test user enrollment

**Potential Issue**: The profile update for test user enrollment might fail if:
- The profile doesn't exist yet (race condition)
- The columns don't exist in the database
- RLS policies prevent the update

### 3. **Async/Await Flow**
The test user enrollment happens after profile creation, but there might be timing issues.

## Debugging Changes Made

### 1. **Enhanced Logging**
Added console.log statements to track:
- Profile creation status
- Test user enrollment process
- Column update attempts
- Error details

### 2. **Profile Existence Check**
Modified `setTestUserStatus` to verify the profile exists before attempting updates.

### 3. **Default Values**
Added default values for test user columns when creating the initial profile:
```javascript
{
  is_test_user: false,
  test_subscriptions: [],
  test_user_type: 'none',
  test_expires_at: null,
  test_user_metadata: {},
}
```

### 4. **Debug Tools Created**

#### SQL Scripts:
- `/scripts/check-test-user-integration.sql` - Checks database state
- `/scripts/verify-test-user-columns.sql` - Verifies and adds missing columns

#### Debug Utilities:
- `/src/utils/debugTestUser.ts` - Helper functions for debugging
- `/src/screens/TestUserDebugScreen.tsx` - UI for testing (optional)

## How to Debug

### 1. **Check Database Schema**
Run the verification script in Supabase SQL editor:
```sql
-- Run the contents of /scripts/verify-test-user-columns.sql
```

### 2. **Monitor Console Logs**
When signing up with a test email (@noisemeld.com), watch for:
```
Creating profile for user: [UUID]
Profile created successfully: [data]
Checking test user enrollment for: [email]
setTestUserStatus called with: [parameters]
Profile update successful: [data]
Test user enrollment result: [result]
```

### 3. **Common Error Messages**
- `Column 'test_user_type' does not exist` - Migration 005 hasn't run
- `Profile does not exist for user` - Profile creation failed
- `null value in column "test_user_type"` - Column exists but has constraint issues

## Test Emails
The following email domains automatically get test access:
- `@noisemeld.com` - Beta access (90 days)
- `@test.coachmeld.com` - Beta access (90 days)
- `@beta.coachmeld.com` - Beta access (90 days)

## Quick Fixes

### If columns are missing:
1. Run the migration manually:
   ```sql
   -- Run the contents of /supabase/migrations/005_enhanced_test_users.sql
   ```

### If profile creation fails:
1. Check RLS policies on the profiles table
2. Ensure the auth.users trigger creates profiles correctly

### If test user enrollment fails:
1. Check that the email domain matches the test domains
2. Verify the profile exists before enrollment
3. Check RLS policies allow updates to test user fields

## Next Steps
1. Test signup with a @noisemeld.com email
2. Check console logs for specific error messages
3. Verify database columns exist using the SQL scripts
4. If issues persist, check Supabase logs for database errors