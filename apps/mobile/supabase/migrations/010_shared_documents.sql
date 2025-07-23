-- Migration to enable document sharing across multiple coaches
-- This removes the 1:1 relationship between documents and coaches
-- and creates a many-to-many relationship through a junction table

-- Create junction table for coach-document relationships
CREATE TABLE IF NOT EXISTS coach_document_access (
    coach_id VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL REFERENCES coach_documents(id) ON DELETE CASCADE,
    access_tier VARCHAR(20) DEFAULT 'free' CHECK (access_tier IN ('free', 'premium', 'pro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (coach_id, document_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_coach_document_access_coach ON coach_document_access(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_document_access_document ON coach_document_access(document_id);

-- Migrate existing data (if any) to junction table
-- This preserves any existing coach-document relationships
INSERT INTO coach_document_access (coach_id, document_id, access_tier)
SELECT DISTINCT 
    cd.coach_id,
    cd.id as document_id,
    COALESCE(cat.required_tier, 'free') as access_tier
FROM coach_documents cd
LEFT JOIN coach_access_tiers cat ON cd.id = cat.document_id
WHERE cd.coach_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Also migrate from document_sources
INSERT INTO coach_document_access (coach_id, document_id, access_tier)
SELECT DISTINCT 
    ds.coach_id,
    cd.id as document_id,
    'free' as access_tier
FROM document_sources ds
JOIN coach_documents cd ON cd.source_id = ds.id
WHERE ds.coach_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM coach_document_access cda 
    WHERE cda.coach_id = ds.coach_id AND cda.document_id = cd.id
  );

-- Drop existing policies that depend on coach_id column BEFORE dropping the column
DROP POLICY IF EXISTS "Users can read documents based on subscription tier" ON coach_documents;

-- Drop the coach_id columns (after migration)
ALTER TABLE document_sources DROP COLUMN IF EXISTS coach_id;
ALTER TABLE coach_documents DROP COLUMN IF EXISTS coach_id;

-- Update the search function to use the junction table
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
    
    -- Perform vector search with access control through junction table
    RETURN QUERY
    SELECT 
        cd.id,
        cd.title,
        cd.content,
        cd.metadata,
        1 - (cd.embedding <=> query_embedding) as similarity_score
    FROM coach_documents cd
    JOIN coach_document_access cda ON cd.id = cda.document_id
    WHERE cda.coach_id = p_coach_id
    AND cd.is_active = true
    AND (
        cda.access_tier = 'free'
        OR (user_has_subscription AND cda.access_tier IN ('premium', 'pro'))
    )
    AND (1 - (cd.embedding <=> query_embedding)) >= p_threshold
    ORDER BY cd.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;

-- Create a function to add coach access to a document
CREATE OR REPLACE FUNCTION add_coach_document_access(
    p_document_id UUID,
    p_coach_ids TEXT[],
    p_access_tier VARCHAR(20) DEFAULT 'free'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    coach_id TEXT;
    insert_count INTEGER := 0;
BEGIN
    FOREACH coach_id IN ARRAY p_coach_ids
    LOOP
        INSERT INTO coach_document_access (coach_id, document_id, access_tier)
        VALUES (coach_id, p_document_id, p_access_tier)
        ON CONFLICT (coach_id, document_id) 
        DO UPDATE SET access_tier = EXCLUDED.access_tier;
        
        insert_count := insert_count + 1;
    END LOOP;
    
    RETURN insert_count;
END;
$$;

-- Create a helper function to get all diet coach IDs
CREATE OR REPLACE FUNCTION get_diet_coach_ids()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY['carnivore', 'carnivore-pro', 'paleo', 'lowcarb', 'keto', 'ketovore', 'lion'];
$$;

-- Update RLS policies to work with new structure
CREATE POLICY "Users can read documents based on subscription tier" ON coach_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM coach_document_access cda
            JOIN subscriptions s ON s.coach_id::text = cda.coach_id
            WHERE cda.document_id = coach_documents.id
            AND s.user_id = auth.uid()
            AND s.status = 'active'
            AND (
                cda.access_tier = 'free'
                OR cda.access_tier IN ('premium', 'pro')
            )
        )
    );

-- Add RLS to junction table
ALTER TABLE coach_document_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to coach document access" ON coach_document_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND metadata->>'role' = 'admin'
        )
    );

-- Clean up old coach_access_tiers table as it's replaced by the junction table
DROP TABLE IF EXISTS coach_access_tiers CASCADE;