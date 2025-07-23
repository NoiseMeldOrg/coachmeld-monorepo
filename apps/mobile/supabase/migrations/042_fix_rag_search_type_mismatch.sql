-- Fix type mismatch in search_coach_documents_with_context function
-- The error occurs because coach_id is VARCHAR but being compared to UUID

-- Drop the existing function first
DROP FUNCTION IF EXISTS search_coach_documents_with_context;

-- Recreate with proper type handling
CREATE OR REPLACE FUNCTION search_coach_documents_with_context(
    p_query_embedding vector(768),
    p_user_id UUID,
    p_coach_id TEXT,
    p_match_count INT DEFAULT 5,
    p_match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    document_id UUID,
    coach_id VARCHAR(50),
    source_id UUID,
    title TEXT,
    content TEXT,
    chunk_index INT,
    total_chunks INT,
    metadata JSONB,
    similarity FLOAT,
    access_tier VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_active_subscription BOOLEAN;
    v_user_tier VARCHAR(20);
BEGIN
    -- Check if user has active subscription for this coach
    SELECT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p_user_id 
        AND s.coach_id = p_coach_id  -- Both are TEXT/VARCHAR, no casting needed
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
    ) INTO v_has_active_subscription;
    
    -- Determine user tier
    IF v_has_active_subscription THEN
        v_user_tier := 'pro';
    ELSE
        v_user_tier := 'free';
    END IF;
    
    RETURN QUERY
    WITH coach_docs AS (
        -- Get documents accessible to this coach
        SELECT 
            cd.id as document_id,
            cda.coach_id,
            cd.source_id,
            cd.title,
            cd.content,
            cd.chunk_index,
            cd.total_chunks,
            cd.metadata,
            1 - (cd.embedding <=> p_query_embedding) as similarity,
            COALESCE(cda.access_tier, 'free') as access_tier
        FROM coach_documents cd
        JOIN coach_document_access cda ON cd.id = cda.document_id
        WHERE cda.coach_id = p_coach_id  -- Both are VARCHAR, no casting needed
        AND cd.is_active = true
        AND 1 - (cd.embedding <=> p_query_embedding) > p_match_threshold
    ),
    user_context_docs AS (
        -- Get user context documents
        SELECT 
            cd.id as document_id,
            p_coach_id as coach_id,  -- Use the provided coach_id
            cd.source_id,
            cd.title,
            cd.content,
            cd.chunk_index,
            cd.total_chunks,
            cd.metadata,
            1 - (cd.embedding <=> p_query_embedding) as similarity,
            'free'::VARCHAR(20) as access_tier
        FROM coach_documents cd
        JOIN document_sources ds ON cd.source_id = ds.id
        WHERE ds.source_type = 'user_context'
        AND ds.metadata->>'userId' = p_user_id::TEXT
        AND cd.is_active = true
        AND 1 - (cd.embedding <=> p_query_embedding) > p_match_threshold
    ),
    all_docs AS (
        SELECT * FROM coach_docs
        UNION ALL
        SELECT * FROM user_context_docs
    )
    SELECT DISTINCT ON (document_id) *
    FROM all_docs
    WHERE 
        CASE 
            WHEN access_tier = 'free' THEN true
            WHEN access_tier = 'premium' AND v_user_tier IN ('premium', 'pro') THEN true
            WHEN access_tier = 'pro' AND v_user_tier = 'pro' THEN true
            ELSE false
        END
    ORDER BY document_id, similarity DESC
    LIMIT p_match_count;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION search_coach_documents_with_context TO authenticated;
GRANT EXECUTE ON FUNCTION search_coach_documents_with_context TO anon;

-- Also ensure the coach_id columns are properly indexed
CREATE INDEX IF NOT EXISTS idx_coach_document_access_coach_id ON coach_document_access(coach_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_coach_user ON subscriptions(user_id, coach_id, status);