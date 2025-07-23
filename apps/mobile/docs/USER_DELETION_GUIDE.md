# User Deletion Guide

## Method 1: Supabase Dashboard (RECOMMENDED) ✅

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Users**
3. **Click the checkbox** on the left side of the user's row
4. Click the **Delete** button at the top of the screen
5. Confirm the deletion

**Benefits:**
- Handles all foreign key relationships automatically
- Deletes from all related tables in the correct order
- No SQL knowledge required
- Safest method

## Method 2: SQL Script (Advanced Users Only)

Only use this if you can't access the Dashboard UI:

```sql
-- Replace email with the user you want to delete
DO $$
DECLARE
    user_email TEXT := 'user@example.com';  -- Change this
    user_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Delete in correct order (child tables first)
        DELETE FROM messages WHERE user_id = user_id;
        DELETE FROM subscriptions WHERE user_id = user_id;
        DELETE FROM profiles WHERE id = user_id;
        DELETE FROM auth.users WHERE id = user_id;
        
        RAISE NOTICE 'User % deleted successfully', user_email;
    END IF;
END $$;
```

## Common Issues

### "Profile already exists" error during signup
This happens when a profile record exists without a matching auth user. Clean it up with:

```sql
-- Delete orphaned profile
DELETE FROM profiles WHERE email = 'user@example.com';
```

### Why Deletion Order Matters
1. `messages` and `subscriptions` reference `user_id`
2. `profiles` has a foreign key to `auth.users`
3. Must delete child records before parent records
4. The Dashboard method handles this automatically

## Best Practice
**Always use the Dashboard method** - it's the safest and most reliable way to delete users.