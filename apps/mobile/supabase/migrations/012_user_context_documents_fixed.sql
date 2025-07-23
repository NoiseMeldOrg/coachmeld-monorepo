-- Add support for user context documents
-- These documents contain user profile and conversation history
-- and are automatically updated when profile or messages change

-- First, we need to update the CHECK constraint on source_type to include 'user_context'
ALTER TABLE document_sources DROP CONSTRAINT IF EXISTS document_sources_source_type_check;
ALTER TABLE document_sources ADD CONSTRAINT document_sources_source_type_check 
    CHECK (source_type IN ('pdf', 'txt', 'md', 'docx', 'url', 'user_context'));

-- Create RLS policy for user context documents
-- Users can only access their own context documents
CREATE POLICY "Users can read own context documents" ON document_sources
    FOR SELECT 
    USING (
        source_type = 'user_context' 
        AND metadata->>'userId' = auth.uid()::text
    );

CREATE POLICY "Users can update own context documents" ON document_sources
    FOR UPDATE 
    USING (
        source_type = 'user_context' 
        AND metadata->>'userId' = auth.uid()::text
    );

-- Index for faster user context lookups
CREATE INDEX IF NOT EXISTS idx_document_sources_user_context 
    ON document_sources((metadata->>'userId')) 
    WHERE source_type = 'user_context';

-- Function to automatically include user context in RAG searches
CREATE OR REPLACE FUNCTION search_coach_documents_with_context(
    query_embedding vector,
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
    
    RETURN QUERY
    WITH eligible_documents AS (
        -- Get coach-specific documents
        SELECT 
            cd.id,
            cd.title,
            cd.content,
            cd.metadata,
            cd.embedding,
            cda.access_tier
        FROM coach_documents cd
        JOIN coach_document_access cda ON cd.id = cda.document_id
        WHERE cda.coach_id = p_coach_id
        AND cd.is_active = true
        
        UNION ALL
        
        -- Always include user's own context document
        SELECT 
            cd.id,
            cd.title,
            cd.content,
            cd.metadata,
            cd.embedding,
            'free'::varchar as access_tier
        FROM coach_documents cd
        JOIN document_sources ds ON cd.source_id = ds.id
        WHERE ds.source_type = 'user_context'
        AND ds.metadata->>'userId' = p_user_id::text
        AND cd.is_active = true
    )
    SELECT 
        ed.id as document_id,
        ed.title,
        ed.content,
        ed.metadata,
        1 - (ed.embedding <=> query_embedding) as similarity_score
    FROM eligible_documents ed
    WHERE (
        ed.access_tier = 'free' 
        OR (ed.access_tier IN ('premium', 'pro') AND user_has_subscription)
    )
    AND ed.embedding IS NOT NULL
    AND 1 - (ed.embedding <=> query_embedding) >= p_threshold
    ORDER BY ed.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;

-- Update the original search function to use the new one
DROP FUNCTION IF EXISTS search_coach_documents(vector, text, uuid, integer, float);
CREATE OR REPLACE FUNCTION search_coach_documents(
    query_embedding vector,
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
AS $$
BEGIN
    -- Just call the new function that includes context
    RETURN QUERY
    SELECT * FROM search_coach_documents_with_context(
        query_embedding,
        p_coach_id,
        p_user_id,
        p_limit,
        p_threshold
    );
END;
$$;