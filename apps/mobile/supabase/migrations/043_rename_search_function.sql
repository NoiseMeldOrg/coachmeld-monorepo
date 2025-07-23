-- Rename search function to match what the code expects
-- The RAG service is calling search_coach_documents_with_access
-- but the function is named search_coach_documents_with_context

-- Drop the existing function
DROP FUNCTION IF EXISTS search_coach_documents_with_context;

-- Create function with the correct name that the code expects
CREATE OR REPLACE FUNCTION search_coach_documents_with_access(
    p_coach_id TEXT,
    p_user_id UUID,
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
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
        AND s.coach_id = p_coach_id
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
            cd.id,
            cd.content,
            cd.metadata,
            1 - (cd.embedding <=> query_embedding) as similarity
        FROM coach_documents cd
        JOIN coach_document_access cda ON cd.id = cda.document_id
        WHERE cda.coach_id = p_coach_id
        AND cd.is_active = true
        AND 1 - (cd.embedding <=> query_embedding) > match_threshold
    ),
    user_context_docs AS (
        -- Get user context documents
        SELECT 
            cd.id,
            cd.content,
            cd.metadata,
            1 - (cd.embedding <=> query_embedding) as similarity
        FROM coach_documents cd
        JOIN document_sources ds ON cd.source_id = ds.id
        WHERE ds.source_type = 'user_context'
        AND ds.metadata->>'userId' = p_user_id::TEXT
        AND cd.is_active = true
        AND 1 - (cd.embedding <=> query_embedding) > match_threshold
    ),
    all_docs AS (
        SELECT * FROM coach_docs
        UNION ALL
        SELECT * FROM user_context_docs
    )
    SELECT DISTINCT ON (id) 
        id,
        content,
        metadata,
        similarity
    FROM all_docs
    WHERE 
        -- Check access tier if it exists
        CASE 
            WHEN metadata->>'access_tier' = 'free' OR metadata->>'access_tier' IS NULL THEN true
            WHEN metadata->>'access_tier' = 'premium' AND v_user_tier IN ('premium', 'pro') THEN true
            WHEN metadata->>'access_tier' = 'pro' AND v_user_tier = 'pro' THEN true
            ELSE false
        END
    ORDER BY id, similarity DESC
    LIMIT match_count;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO authenticated;
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION search_coach_documents_with_access IS 'Search coach documents with vector similarity, including user context documents and respecting access tiers';