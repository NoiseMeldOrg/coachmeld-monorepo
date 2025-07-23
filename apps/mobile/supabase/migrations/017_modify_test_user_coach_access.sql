-- Migration: Modify test user coach access
-- Remove automatic access to all coaches for test users
-- Test users will only have test payment capability

-- Drop the existing function
DROP FUNCTION IF EXISTS can_user_access_coach(UUID, UUID);

-- Recreate the function without automatic test user access
CREATE OR REPLACE FUNCTION can_user_access_coach(user_uuid UUID, coach_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    coach_is_free BOOLEAN;
    has_subscription BOOLEAN;
BEGIN
    -- Check if coach is free
    SELECT is_free INTO coach_is_free FROM coaches WHERE id = coach_uuid;
    IF coach_is_free THEN RETURN true; END IF;
    
    -- Check for active subscription (including test subscriptions)
    SELECT EXISTS(
        SELECT 1 FROM subscriptions 
        WHERE user_id = user_uuid 
        AND coach_id = coach_uuid 
        AND status IN ('active', 'trial')
    ) INTO has_subscription;
    
    RETURN has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_user_available_coaches function to show subscription status correctly
DROP FUNCTION IF EXISTS get_user_available_coaches(UUID);

CREATE OR REPLACE FUNCTION get_user_available_coaches(user_uuid UUID)
RETURNS TABLE (
    coach_id UUID,
    name TEXT,
    description TEXT,
    coach_type TEXT,
    is_free BOOLEAN,
    monthly_price DECIMAL,
    has_active_subscription BOOLEAN,
    subscription_status TEXT,
    can_use_test_payment BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as coach_id,
        c.name,
        c.description,
        c.coach_type,
        c.is_free,
        c.monthly_price,
        CASE 
            WHEN c.is_free THEN true
            WHEN s.id IS NOT NULL AND s.status IN ('active', 'trial') THEN true
            ELSE false
        END as has_active_subscription,
        COALESCE(s.status, CASE WHEN c.is_free THEN 'free' ELSE 'none' END) as subscription_status,
        COALESCE(p.is_test_user, false) as can_use_test_payment
    FROM coaches c
    LEFT JOIN subscriptions s ON c.id = s.coach_id 
        AND s.user_id = user_uuid 
        AND s.status IN ('active', 'trial')
    LEFT JOIN profiles p ON p.id = user_uuid
    WHERE c.is_active = true
    ORDER BY c.sort_order, c.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a function to check if user can use test payments
CREATE OR REPLACE FUNCTION can_user_use_test_payment(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_is_test BOOLEAN;
    test_payment_enabled BOOLEAN;
BEGIN
    -- Check if user is test user
    SELECT 
        COALESCE(is_test_user, false),
        COALESCE(test_user_metadata->>'enableTestPayments' = 'true', false)
    INTO user_is_test, test_payment_enabled
    FROM profiles 
    WHERE id = user_uuid;
    
    -- Test users can always use test payments
    -- Regular users need explicit enablement
    RETURN user_is_test OR test_payment_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up any auto-created test subscriptions that shouldn't exist
-- This removes subscriptions that were auto-created just because user was a test user
DELETE FROM subscriptions s
USING profiles p
WHERE s.user_id = p.id
  AND p.is_test_user = true
  AND s.is_test_subscription = true
  AND s.metadata->>'auto_created' = 'true';

-- Add comment explaining the new behavior
COMMENT ON FUNCTION can_user_access_coach IS 
'Checks if a user can access a coach. Test users no longer get automatic access - they must use test payments to subscribe.';

COMMENT ON FUNCTION can_user_use_test_payment IS 
'Checks if a user can use the test payment modal. Test users always can, regular users need explicit enablement.';