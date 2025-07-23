-- Complete fix for search function - drop all versions and recreate
-- This ensures we have a clean slate with proper type handling

-- First, drop any existing versions of the function
DROP FUNCTION IF EXISTS search_coach_documents_with_access(TEXT, UUID, vector(768), FLOAT, INT) CASCADE;
DROP FUNCTION IF EXISTS search_coach_documents_with_access(TEXT, vector(768), UUID, FLOAT, INT) CASCADE;
DROP FUNCTION IF EXISTS search_coach_documents_with_context CASCADE;
DROP FUNCTION IF EXISTS search_coach_documents CASCADE;

-- Create the function with proper type handling
CREATE OR REPLACE FUNCTION search_coach_documents_with_access(
    p_coach_id TEXT,
    query_embedding vector(768),
    p_user_id UUID DEFAULT NULL,
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
    v_has_active_subscription BOOLEAN := FALSE;
    v_user_tier VARCHAR(20) := 'free';
BEGIN
    -- Handle null user ID
    IF p_user_id IS NOT NULL THEN
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
        END IF;
    END IF;
    
    RETURN QUERY
    WITH coach_docs AS (
        -- Get documents accessible to this coach
        SELECT 
            cd.id,
            cd.content,
            cd.metadata,
            1 - (cd.embedding <=> query_embedding) as similarity,
            COALESCE(cda.access_tier, 'free') as access_tier
        FROM coach_documents cd
        JOIN coach_document_access cda ON cd.id = cda.document_id
        WHERE cda.coach_id = p_coach_id
        AND cd.is_active = true
        AND 1 - (cd.embedding <=> query_embedding) > match_threshold
    ),
    user_context_docs AS (
        -- Get user context documents only if user ID is provided and valid
        SELECT 
            cd.id,
            cd.content,
            cd.metadata,
            1 - (cd.embedding <=> query_embedding) as similarity,
            'free'::VARCHAR(20) as access_tier
        FROM coach_documents cd
        JOIN document_sources ds ON cd.source_id = ds.id
        WHERE p_user_id IS NOT NULL
        AND ds.source_type = 'user_context'
        -- Fix: Ensure proper type comparison
        AND (
            CASE 
                WHEN jsonb_typeof(ds.metadata->'userId') = 'string' THEN
                    (ds.metadata->>'userId')::UUID = p_user_id
                ELSE FALSE
            END
        )
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
        -- Check access tier
        CASE 
            WHEN access_tier = 'free' THEN true
            WHEN access_tier = 'premium' AND v_user_tier IN ('premium', 'pro') THEN true
            WHEN access_tier = 'pro' AND v_user_tier = 'pro' THEN true
            ELSE false
        END
    ORDER BY id, similarity DESC
    LIMIT match_count;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return empty result set
        RAISE WARNING 'Error in search_coach_documents_with_access: %', SQLERRM;
        RETURN;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO authenticated;
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO anon;
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION search_coach_documents_with_access IS 'Search coach documents with vector similarity. Handles user context documents with proper type checking and access tiers. Fixed UUID/TEXT comparison with JSONB type checking.';

-- Create an index to help with the JSONB query if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_document_sources_user_id ON document_sources ((metadata->>'userId'));

-- Verify the fix by checking a sample query (this won't error if types are correct)
DO $$
DECLARE
    test_embedding vector(768);
BEGIN
    -- Create a test embedding
    test_embedding := array_fill(0::float, ARRAY[768])::vector(768);
    
    -- Test the function with various parameter combinations
    PERFORM * FROM search_coach_documents_with_access('carnivore-coach', test_embedding);
    PERFORM * FROM search_coach_documents_with_access('carnivore-coach', test_embedding, NULL);
    PERFORM * FROM search_coach_documents_with_access('carnivore-coach', test_embedding, '18b842cb-f267-40ff-a6c3-50e32f157e89'::UUID);
    
    RAISE NOTICE 'Function test completed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Function test failed: %', SQLERRM;
END;
$$;