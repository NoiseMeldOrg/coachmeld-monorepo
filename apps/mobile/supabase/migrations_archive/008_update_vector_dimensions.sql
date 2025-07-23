-- Migration: Update vector dimensions from 1536 to 3072 for Gemini embeddings
-- This migration updates all vector columns to support Gemini's 3072-dimensional embeddings

-- Drop existing indexes that depend on vector columns
DROP INDEX IF EXISTS idx_coach_documents_embedding;

-- Update vector columns to 3072 dimensions
ALTER TABLE coach_documents 
ALTER COLUMN embedding TYPE vector(3072);

ALTER TABLE rag_query_cache 
ALTER COLUMN query_embedding TYPE vector(3072);

ALTER TABLE document_versions 
ALTER COLUMN embedding TYPE vector(3072);

-- Recreate the IVFFlat index with new dimensions
-- Note: We're using more lists (200 vs 100) since we have more dimensions
CREATE INDEX idx_coach_documents_embedding ON coach_documents 
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 200);

-- Update the search function to handle 3072 dimensions
CREATE OR REPLACE FUNCTION search_coach_documents(
    query_embedding vector(3072),  -- Updated dimension
    p_coach_id TEXT,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 5,
    p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    document_id UUID,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_has_subscription BOOLEAN;
BEGIN
    -- Check if user has active subscription for this coach
    SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
        AND coach_id::text = p_coach_id
        AND status = 'active'
    ) INTO user_has_subscription;
    
    -- Perform vector search with access control
    RETURN QUERY
    SELECT 
        cd.id,
        cd.title,
        cd.content,
        cd.metadata,
        1 - (cd.embedding <=> query_embedding) as similarity_score
    FROM coach_documents cd
    LEFT JOIN coach_access_tiers cat ON cd.id = cat.document_id
    WHERE cd.coach_id = p_coach_id
    AND cd.is_active = true
    AND (
        cat.required_tier IS NULL 
        OR cat.required_tier = 'free'
        OR (user_has_subscription AND cat.required_tier = 'premium')
    )
    AND (1 - (cd.embedding <=> query_embedding)) >= p_threshold
    ORDER BY cd.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;

-- Add a comment explaining the dimension change
COMMENT ON COLUMN coach_documents.embedding IS 'Document embedding vector (3072 dimensions for Gemini text-embedding-004)';
COMMENT ON COLUMN rag_query_cache.query_embedding IS 'Query embedding vector (3072 dimensions for Gemini text-embedding-004)';
COMMENT ON COLUMN document_versions.embedding IS 'Version embedding vector (3072 dimensions for Gemini text-embedding-004)';

-- Log the migration
INSERT INTO compliance_audit_log (
    event_type,
    entity_type,
    action,
    metadata
) VALUES (
    'system_upgrade',
    'embeddings',
    'Updated vector dimensions from 1536 to 3072 for Gemini embeddings',
    jsonb_build_object(
        'old_dimensions', 1536,
        'new_dimensions', 3072,
        'embedding_model', 'gemini-text-embedding-004',
        'migration_version', '008'
    )
);