-- Quick user deletion script (ONLY use if Dashboard method is not available)
-- RECOMMENDED: Use Supabase Dashboard > Authentication > Users > Checkbox > Delete button

-- Replace 'user@email.com' with the email you want to delete

-- All-in-one deletion (run this entire block)
DO $$
DECLARE
    user_email TEXT := 'introversionary@gmail.com';  -- Change this email
    user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Delete in correct order
        DELETE FROM messages WHERE user_id = user_id;
        DELETE FROM subscriptions WHERE user_id = user_id;
        DELETE FROM profiles WHERE id = user_id;
        DELETE FROM auth.users WHERE id = user_id;
        
        RAISE NOTICE 'User % deleted successfully', user_email;
    ELSE
        RAISE NOTICE 'User % not found', user_email;
    END IF;
END $$;

-- Alternative: If the above doesn't work, use these individual commands:
/*
-- Step 1: Find user ID
SELECT id FROM auth.users WHERE email = 'introversionary@gmail.com';

-- Step 2: Delete using the ID (replace 'xxxx' with actual ID)
DELETE FROM messages WHERE user_id = 'xxxx';
DELETE FROM subscriptions WHERE user_id = 'xxxx';
DELETE FROM profiles WHERE id = 'xxxx';
DELETE FROM auth.users WHERE id = 'xxxx';
*/