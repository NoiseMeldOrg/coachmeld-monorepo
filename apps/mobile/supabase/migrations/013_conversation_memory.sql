-- Conversation summaries table
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coach_id VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    key_facts TEXT[] DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    last_message_id UUID NOT NULL,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one summary per user-coach combination at a time
    CONSTRAINT unique_user_coach_summary UNIQUE (user_id, coach_id, created_at)
);

-- User memories table for persistent facts
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    facts JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    health_data JSONB DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation topics table for tracking discussed subjects
CREATE TABLE IF NOT EXISTS conversation_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coach_id VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_discussed TIMESTAMPTZ DEFAULT NOW(),
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    
    CONSTRAINT unique_user_coach_topic UNIQUE (user_id, coach_id, topic)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_coach 
    ON conversation_summaries(user_id, coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_user_coach 
    ON conversation_topics(user_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_user 
    ON user_memories(user_id);

-- RLS Policies
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversation summaries
CREATE POLICY "Users can view own conversation summaries" ON conversation_summaries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation summaries" ON conversation_summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation summaries" ON conversation_summaries
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own memories
CREATE POLICY "Users can view own memories" ON user_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON user_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON user_memories
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own topics
CREATE POLICY "Users can view own topics" ON conversation_topics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics" ON conversation_topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics" ON conversation_topics
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to get conversation context with memory
CREATE OR REPLACE FUNCTION get_conversation_context(
    p_user_id UUID,
    p_coach_id VARCHAR(50),
    p_message_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    recent_messages JSONB,
    summary TEXT,
    key_facts TEXT[],
    topics TEXT[],
    user_facts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recent_messages JSONB;
    v_summary TEXT;
    v_key_facts TEXT[];
    v_topics TEXT[];
    v_user_facts JSONB;
BEGIN
    -- Get recent messages
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'id', m.id,
                'text', m.content,
                'sender', CASE WHEN m.is_user THEN 'user' ELSE 'coach' END,
                'timestamp', m.created_at
            ) ORDER BY m.created_at DESC
        ) FILTER (WHERE m.id IS NOT NULL),
        '[]'::json
    )::jsonb
    INTO v_recent_messages
    FROM (
        SELECT * FROM messages
        WHERE user_id = p_user_id 
        AND coach_id = p_coach_id
        ORDER BY created_at DESC
        LIMIT p_message_limit
    ) m;
    
    -- Get latest summary
    SELECT 
        cs.summary,
        cs.key_facts,
        cs.topics
    INTO 
        v_summary,
        v_key_facts,
        v_topics
    FROM conversation_summaries cs
    WHERE cs.user_id = p_user_id 
    AND cs.coach_id = p_coach_id
    ORDER BY cs.created_at DESC
    LIMIT 1;
    
    -- Get user facts
    SELECT um.facts
    INTO v_user_facts
    FROM user_memories um
    WHERE um.user_id = p_user_id;
    
    RETURN QUERY
    SELECT 
        v_recent_messages,
        v_summary,
        COALESCE(v_key_facts, '{}'::text[]),
        COALESCE(v_topics, '{}'::text[]),
        COALESCE(v_user_facts, '{}'::jsonb);
END;
$$;