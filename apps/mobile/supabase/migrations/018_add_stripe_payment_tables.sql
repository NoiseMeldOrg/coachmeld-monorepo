-- Migration: 018_add_stripe_payment_tables.sql
-- Description: Add tables for Stripe payment integration and message limiting

-- Add Stripe fields to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Create message limits table for tracking free tier usage
CREATE TABLE IF NOT EXISTS message_limits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- Add index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_message_limits_date ON message_limits(date);

-- Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id 
ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Create subscription events table for webhook history
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Add index for event lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);

-- RLS policies for message_limits
ALTER TABLE message_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message limits"
ON message_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message limits"
ON message_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message limits"
ON message_limits FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON payments FOR SELECT
USING (auth.uid() = user_id);

-- Only allow inserts through service role (webhooks)
-- No direct user insert policy

-- RLS policies for subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription events"
ON subscription_events FOR SELECT
USING (auth.uid() = user_id);

-- Function to check if user has exceeded message limit
CREATE OR REPLACE FUNCTION check_message_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_has_subscription BOOLEAN;
BEGIN
  -- Check if user has active subscription
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ) INTO v_has_subscription;

  -- If they have subscription, they have no limit
  IF v_has_subscription THEN
    RETURN TRUE;
  END IF;

  -- Check today's message count
  SELECT COALESCE(count, 0) INTO v_count
  FROM message_limits
  WHERE user_id = p_user_id
  AND date = CURRENT_DATE;

  -- Free tier limit is 10 messages per day
  RETURN v_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment message count
CREATE OR REPLACE FUNCTION increment_message_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO message_limits (user_id, date, count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = message_limits.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;