-- Migration: Enhanced Test User System
-- Description: Adds multi-tier test user support with expiration and metadata

-- Add new columns to profiles table for enhanced test user functionality
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS test_user_type TEXT DEFAULT 'none' CHECK (test_user_type IN ('none', 'beta', 'partner', 'investor', 'internal')),
ADD COLUMN IF NOT EXISTS test_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS test_user_metadata JSONB DEFAULT '{}';

-- Add test payment metadata to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS test_payment_metadata JSONB DEFAULT NULL;

-- Create index for test user queries
CREATE INDEX IF NOT EXISTS idx_profiles_test_user ON profiles(is_test_user) WHERE is_test_user = true;
CREATE INDEX IF NOT EXISTS idx_profiles_test_expires ON profiles(test_expires_at) WHERE test_expires_at IS NOT NULL;

-- Update existing test users to have a type
UPDATE profiles 
SET test_user_type = 'beta' 
WHERE is_test_user = true AND test_user_type = 'none';

-- Function to check if test user access has expired
CREATE OR REPLACE FUNCTION check_test_user_expiration(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT is_test_user, test_user_type, test_expires_at 
  INTO user_record
  FROM profiles 
  WHERE id = user_id;
  
  -- Not a test user
  IF NOT user_record.is_test_user THEN
    RETURN FALSE;
  END IF;
  
  -- Permanent access types
  IF user_record.test_user_type IN ('partner', 'internal') THEN
    RETURN FALSE;
  END IF;
  
  -- Check expiration
  IF user_record.test_expires_at IS NOT NULL AND user_record.test_expires_at < NOW() THEN
    -- Disable test access
    UPDATE profiles 
    SET is_test_user = FALSE, 
        test_user_type = 'none'
    WHERE id = user_id;
    
    RETURN TRUE; -- Has expired
  END IF;
  
  RETURN FALSE; -- Not expired
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the can_user_access_coach function to check expiration
CREATE OR REPLACE FUNCTION can_user_access_coach(p_user_id UUID, p_coach_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_free BOOLEAN;
  v_has_subscription BOOLEAN;
  v_is_test_user BOOLEAN;
  v_test_expired BOOLEAN;
BEGIN
  -- Check if test user access has expired
  v_test_expired := check_test_user_expiration(p_user_id);
  
  -- Check if coach is free
  SELECT is_free INTO v_is_free 
  FROM coaches 
  WHERE id = p_coach_id;
  
  IF v_is_free THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is test user (and not expired)
  SELECT is_test_user INTO v_is_test_user 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_is_test_user AND NOT v_test_expired THEN
    RETURN TRUE;
  END IF;
  
  -- Check for active subscription
  SELECT EXISTS(
    SELECT 1 
    FROM subscriptions 
    WHERE user_id = p_user_id 
      AND coach_id = p_coach_id 
      AND status = 'active'
  ) INTO v_has_subscription;
  
  RETURN v_has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for test user metadata
CREATE POLICY "Users can view their own test status" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can update test status" ON profiles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create a view for test user analytics
CREATE OR REPLACE VIEW test_user_analytics AS
SELECT 
  p.id,
  p.email,
  p.test_user_type,
  p.test_expires_at,
  p.created_at as user_created_at,
  p.test_user_metadata,
  COUNT(DISTINCT s.coach_id) as coaches_accessed,
  COUNT(DISTINCT m.id) as messages_sent,
  MAX(m.created_at) as last_message_at
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
LEFT JOIN messages m ON p.id = m.user_id
WHERE p.is_test_user = true
GROUP BY p.id, p.email, p.test_user_type, p.test_expires_at, p.created_at, p.test_user_metadata;

-- Grant access to the view
GRANT SELECT ON test_user_analytics TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN profiles.test_user_type IS 'Type of test user: none (regular), beta (time-limited), partner (permanent), investor (permanent + analytics), internal (full access)';
COMMENT ON COLUMN profiles.test_expires_at IS 'When test access expires (NULL for permanent access)';
COMMENT ON COLUMN profiles.test_user_metadata IS 'Additional metadata for test users (source, invited_by, notes, etc.)';
COMMENT ON COLUMN subscriptions.test_payment_metadata IS 'Metadata for simulated test payments';