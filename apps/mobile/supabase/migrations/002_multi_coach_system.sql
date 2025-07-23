-- Migration: Add multi-coach subscription system
-- Version: 002
-- Description: Adds support for multiple AI coaches with subscription management

-- Coaches table
CREATE TABLE coaches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    coach_type TEXT NOT NULL,
    is_free BOOLEAN DEFAULT false,
    monthly_price DECIMAL(10,2) DEFAULT 0,
    color_theme JSONB NOT NULL DEFAULT '{"primary": "#0084ff", "secondary": "#44bec7"}',
    icon_name TEXT DEFAULT 'chatbubbles',
    features TEXT[] DEFAULT '{}',
    knowledge_base_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'paused')),
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    is_test_subscription BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, coach_id, status)
);

-- User coach preferences
CREATE TABLE user_coach_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    active_coach_id UUID REFERENCES coaches(id),
    custom_coach_names JSONB DEFAULT '{}',
    favorite_coaches UUID[] DEFAULT '{}',
    last_used_coach_id UUID REFERENCES coaches(id),
    coach_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach knowledge base for basic coach
CREATE TABLE coach_knowledge_base (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subcategory TEXT,
    question_patterns TEXT[] NOT NULL,
    answer_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    min_confidence DECIMAL(3,2) DEFAULT 0.7,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add coach_id to existing messages table
ALTER TABLE messages 
ADD COLUMN coach_id UUID REFERENCES coaches(id),
ADD COLUMN coach_response_metadata JSONB DEFAULT '{}';

-- Add coach_id to ai_coach_requests
ALTER TABLE ai_coach_requests
ADD COLUMN coach_id UUID REFERENCES coaches(id);

-- Add test user fields to profiles
ALTER TABLE profiles
ADD COLUMN is_test_user BOOLEAN DEFAULT false,
ADD COLUMN test_subscriptions JSONB DEFAULT '[]',
ADD COLUMN test_user_metadata JSONB DEFAULT '{}';

-- Create indexes
CREATE INDEX idx_coaches_active ON coaches(is_active);
CREATE INDEX idx_coaches_type ON coaches(coach_type);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_coach_id ON subscriptions(coach_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_user_coach_preferences_user_id ON user_coach_preferences(user_id);
CREATE INDEX idx_coach_knowledge_base_coach_id ON coach_knowledge_base(coach_id);
CREATE INDEX idx_coach_knowledge_base_category ON coach_knowledge_base(category);
CREATE INDEX idx_messages_coach_id ON messages(coach_id);

-- RLS Policies for new tables

-- Coaches table (public read, admin write)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coaches" ON coaches
    FOR SELECT USING (is_active = true);

-- Subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- User coach preferences
ALTER TABLE user_coach_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_coach_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_coach_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_coach_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Coach knowledge base (public read for active entries)
ALTER TABLE coach_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active knowledge base entries" ON coach_knowledge_base
    FOR SELECT USING (is_active = true);

-- Functions

-- Function to get user's available coaches
CREATE OR REPLACE FUNCTION get_user_available_coaches(user_uuid UUID)
RETURNS TABLE (
    coach_id UUID,
    name TEXT,
    description TEXT,
    coach_type TEXT,
    is_free BOOLEAN,
    monthly_price DECIMAL,
    has_active_subscription BOOLEAN,
    subscription_status TEXT
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
            WHEN s.id IS NOT NULL AND s.status = 'active' THEN true
            WHEN p.is_test_user THEN true
            ELSE false
        END as has_active_subscription,
        COALESCE(s.status, CASE WHEN c.is_free THEN 'free' ELSE 'none' END) as subscription_status
    FROM coaches c
    LEFT JOIN subscriptions s ON c.id = s.coach_id 
        AND s.user_id = user_uuid 
        AND s.status IN ('active', 'trial')
    LEFT JOIN profiles p ON p.id = user_uuid
    WHERE c.is_active = true
    ORDER BY c.sort_order, c.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access coach
CREATE OR REPLACE FUNCTION can_user_access_coach(user_uuid UUID, coach_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    coach_is_free BOOLEAN;
    user_is_test BOOLEAN;
    has_subscription BOOLEAN;
BEGIN
    -- Check if coach is free
    SELECT is_free INTO coach_is_free FROM coaches WHERE id = coach_uuid;
    IF coach_is_free THEN RETURN true; END IF;
    
    -- Check if user is test user
    SELECT is_test_user INTO user_is_test FROM profiles WHERE id = user_uuid;
    IF user_is_test THEN RETURN true; END IF;
    
    -- Check for active subscription
    SELECT EXISTS(
        SELECT 1 FROM subscriptions 
        WHERE user_id = user_uuid 
        AND coach_id = coach_uuid 
        AND status IN ('active', 'trial')
    ) INTO has_subscription;
    
    RETURN has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER update_coaches_updated_at
    BEFORE UPDATE ON coaches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_coach_preferences_updated_at
    BEFORE UPDATE ON user_coach_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert default coaches
INSERT INTO coaches (name, description, coach_type, is_free, monthly_price, color_theme, icon_name, features, sort_order) VALUES
('Basic Health Coach', 'Your free AI health companion providing general wellness guidance', 'basic', true, 0, 
 '{"primary": "#0084ff", "secondary": "#44bec7", "accent": "#f0f2f5"}', 
 'heart', 
 ARRAY['General health advice', 'Basic nutrition tips', 'Simple fitness guidance', 'Wellness check-ins'], 
 1),

('Carnivore Coach Pro', 'Expert carnivore diet guidance with personalized meal plans and adaptation support', 'carnivore', false, 9.99,
 '{"primary": "#8B4513", "secondary": "#D2691E", "accent": "#F4A460"}',
 'nutrition',
 ARRAY['Personalized meal plans', 'Adaptation troubleshooting', 'Macro optimization', 'Shopping lists', 'Restaurant guidance'],
 2),

('Fitness Coach Pro', 'Your AI personal trainer for strength, conditioning, and optimal performance', 'fitness', false, 9.99,
 '{"primary": "#FF6B6B", "secondary": "#FF8E53", "accent": "#FFE66D"}',
 'fitness',
 ARRAY['Custom workout plans', 'Form guidance', 'Progress tracking', 'Recovery optimization', 'Injury prevention'],
 3),

('Mindfulness Coach Pro', 'Mental wellness and stress management for better health outcomes', 'mindfulness', false, 9.99,
 '{"primary": "#4ECDC4", "secondary": "#44A1A0", "accent": "#A8DADC"}',
 'happy',
 ARRAY['Meditation guidance', 'Stress reduction', 'Sleep optimization', 'Habit building', 'Emotional support'],
 4);

-- Insert sample knowledge base entries for basic coach
INSERT INTO coach_knowledge_base (coach_id, category, question_patterns, answer_template) 
SELECT 
    id as coach_id,
    'greeting',
    ARRAY['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    'Hello! I''m your Basic Health Coach. I can help you with general health advice, nutrition tips, and simple fitness guidance. What would you like to know about today?'
FROM coaches WHERE coach_type = 'basic';

INSERT INTO coach_knowledge_base (coach_id, category, question_patterns, answer_template)
SELECT 
    id as coach_id,
    'nutrition',
    ARRAY['what should i eat', 'diet advice', 'healthy foods', 'nutrition tips'],
    'For general health, focus on whole foods including lean proteins, vegetables, fruits, and healthy fats. Stay hydrated and minimize processed foods. Would you like specific meal suggestions?'
FROM coaches WHERE coach_type = 'basic';