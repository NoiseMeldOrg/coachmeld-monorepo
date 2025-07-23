-- Create a regular (non-test) user account for testing payment flow
-- This user will NOT have automatic access to all coaches

-- Step 1: Check if user exists
SELECT id, email, is_test_user, test_user_type 
FROM profiles 
WHERE email = 'payment-test@gmail.com';

-- Step 2: If the user exists, make them a regular user
UPDATE profiles 
SET 
    is_test_user = false,
    test_user_type = 'none',
    test_user_metadata = '{}'
WHERE email = 'payment-test@gmail.com';

-- Step 3: Remove any existing subscriptions for clean testing
DELETE FROM subscriptions 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'payment-test@gmail.com');

-- Step 4: Verify the user is now regular
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    (SELECT COUNT(*) FROM subscriptions WHERE user_id = profiles.id AND status = 'active') as active_subscriptions
FROM profiles 
WHERE email = 'payment-test@gmail.com';