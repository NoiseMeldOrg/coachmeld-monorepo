-- Check and clean up duplicate search functions
-- First, let's see what functions exist with this name

-- Drop ALL versions of both function names to clean up
DROP FUNCTION IF EXISTS search_coach_documents_with_context CASCADE;
DROP FUNCTION IF EXISTS search_coach_documents_with_access CASCADE;

-- Drop any overloaded versions with different parameter orders
DROP FUNCTION IF EXISTS search_coach_documents_with_access(TEXT, UUID, vector(768), FLOAT, INT);
DROP FUNCTION IF EXISTS search_coach_documents_with_access(vector(768), UUID, TEXT, INT, FLOAT);
DROP FUNCTION IF EXISTS search_coach_documents_with_access(UUID, TEXT, vector(768), FLOAT, INT);

-- Now create the correct function with the parameter order that ragService.ts expects
-- Looking at the code: p_coach_id, p_user_id, query_embedding, match_threshold, match_count
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
        -- Check access tier from coach_document_access table
        id IN (
            SELECT cd.id
            FROM coach_documents cd
            LEFT JOIN coach_document_access cda ON cd.id = cda.document_id
            WHERE 
                -- User context docs are always accessible
                cd.source_id IN (
                    SELECT id FROM document_sources 
                    WHERE source_type = 'user_context' 
                    AND metadata->>'userId' = p_user_id::TEXT
                )
                OR
                -- Coach docs based on access tier
                (
                    cda.coach_id = p_coach_id AND
                    CASE 
                        WHEN COALESCE(cda.access_tier, 'free') = 'free' THEN true
                        WHEN cda.access_tier = 'premium' AND v_user_tier IN ('premium', 'pro') THEN true
                        WHEN cda.access_tier = 'pro' AND v_user_tier = 'pro' THEN true
                        ELSE false
                    END
                )
        )
    ORDER BY id, similarity DESC
    LIMIT match_count;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO authenticated;
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION search_coach_documents_with_access IS 'Search coach documents with vector similarity, including user context documents and respecting access tiers. Parameter order matches ragService.ts expectations.';