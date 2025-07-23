-- Migration: Fix coach_id type mismatch in search_coach_documents_with_context
-- Description: Fixes the type mismatch error when comparing coach_id (UUID) with p_coach_id (TEXT)

-- Drop the existing function
DROP FUNCTION IF EXISTS search_coach_documents_with_context(vector, text, uuid, integer, float);

-- Recreate the function with proper type casting
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
    -- Fix: Cast p_coach_id to UUID for proper comparison
    SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
        AND coach_id = p_coach_id::UUID  -- Fixed: cast TEXT to UUID
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
        WHERE cda.coach_id = p_coach_id::UUID  -- Fixed: cast TEXT to UUID
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

-- Also check if coach_document_access table needs the access_tier column
DO $$
BEGIN
    -- Check if access_tier column exists in coach_document_access
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'coach_document_access' 
        AND column_name = 'access_tier'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE coach_document_access 
        ADD COLUMN access_tier VARCHAR(50) DEFAULT 'free' 
        CHECK (access_tier IN ('free', 'premium', 'pro'));
    END IF;
END $$;

-- Also check if coach_documents table has the required columns
DO $$
BEGIN
    -- Check if title column exists in coach_documents
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'coach_documents' 
        AND column_name = 'title'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE coach_documents ADD COLUMN title TEXT;
    END IF;
    
    -- Check if is_active column exists in coach_documents
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'coach_documents' 
        AND column_name = 'is_active'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE coach_documents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION search_coach_documents_with_context(vector, text, uuid, integer, float) TO authenticated, anon;