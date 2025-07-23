-- Enable test payment mode for a specific regular user
-- This allows them to use the test payment modal without being a full test user

-- Option 1: Set test payment flag in metadata (recommended)
UPDATE profiles 
SET test_user_metadata = jsonb_set(
    COALESCE(test_user_metadata, '{}'),
    '{enableTestPayments}',
    'true'
)
WHERE email = 'payment-test@gmail.com';

-- Option 2: Make them a limited test user with payment testing only
UPDATE profiles 
SET 
    is_test_user = true,
    test_user_type = 'payment_tester',
    test_user_metadata = jsonb_build_object(
        'purpose', 'payment_flow_testing',
        'restrictedAccess', true,
        'enableTestPayments', true
    )
WHERE email = 'payment-test@gmail.com';

-- Verify the changes
SELECT 
    id,
    email,
    is_test_user,
    test_user_type,
    test_user_metadata
FROM profiles 
WHERE email = 'payment-test@gmail.com';