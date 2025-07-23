-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Document sources tracking
CREATE TABLE IF NOT EXISTS document_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    source_name TEXT NOT NULL,
    source_type VARCHAR(20) CHECK (source_type IN ('pdf', 'txt', 'md', 'docx', 'url')) NOT NULL,
    source_url TEXT,
    file_hash VARCHAR(64) UNIQUE,
    file_size_bytes BIGINT,
    last_processed TIMESTAMPTZ,
    process_status VARCHAR(20) DEFAULT 'pending' CHECK (process_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main vector storage table
CREATE TABLE IF NOT EXISTS coach_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    source_id UUID REFERENCES document_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- OpenAI ada-002 dimensions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure unique chunks per document
    CONSTRAINT unique_source_chunk UNIQUE (source_id, chunk_index)
);

-- Document access control
CREATE TABLE IF NOT EXISTS coach_access_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    document_id UUID REFERENCES coach_documents(id) ON DELETE CASCADE,
    required_tier VARCHAR(20) CHECK (required_tier IN ('free', 'premium', 'pro')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_coach_document_tier UNIQUE (coach_id, document_id)
);

-- Query cache for performance
CREATE TABLE IF NOT EXISTS rag_query_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE NOT NULL,
    coach_id VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    retrieved_documents JSONB NOT NULL,
    retrieval_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions for tracking changes
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    changed_by UUID REFERENCES auth.users(id),
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Usage analytics
CREATE TABLE IF NOT EXISTS document_usage_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES coach_documents(id) ON DELETE CASCADE,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    query_similarity_score FLOAT,
    user_id UUID REFERENCES auth.users(id),
    was_helpful BOOLEAN,
    feedback_text TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_documents_coach_id ON coach_documents(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_documents_source_id ON coach_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_coach_documents_active ON coach_documents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coach_documents_metadata ON coach_documents USING GIN (metadata);

-- Vector similarity search index (using IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS idx_coach_documents_embedding ON coach_documents 
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);

-- Other performance indexes
CREATE INDEX IF NOT EXISTS idx_document_sources_coach_id ON document_sources(coach_id);
CREATE INDEX IF NOT EXISTS idx_document_sources_status ON document_sources(process_status);
CREATE INDEX IF NOT EXISTS idx_access_tiers_coach_doc ON coach_access_tiers(coach_id, document_id);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON rag_query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_coach_hash ON rag_query_cache(coach_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_usage_stats_document ON document_usage_stats(document_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user ON document_usage_stats(user_id);

-- Enable Row Level Security
ALTER TABLE coach_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_access_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Document access based on user subscriptions
CREATE POLICY "Users can read documents based on subscription tier" ON coach_documents
    FOR SELECT USING (
        -- Check if user has access to this coach and tier
        EXISTS (
            SELECT 1 
            FROM subscriptions s
            LEFT JOIN coach_access_tiers cat ON cat.document_id = coach_documents.id
            WHERE s.user_id = auth.uid()
            AND s.coach_id::text = coach_documents.coach_id
            AND s.status = 'active'
            AND (
                cat.required_tier IS NULL -- No tier restriction
                OR cat.required_tier = 'free' -- Free tier
                OR cat.required_tier = 'premium' -- Premium tier
            )
        )
    );

-- Admin full access to documents
CREATE POLICY "Admins can manage all documents" ON coach_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND metadata->>'role' = 'admin'
        )
    );

-- Cache access for authenticated users
CREATE POLICY "Users can read their query cache" ON rag_query_cache
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Usage stats - users can only see their own
CREATE POLICY "Users can manage their own usage stats" ON document_usage_stats
    FOR ALL USING (user_id = auth.uid());

-- Functions for vector operations

-- Secure vector similarity search
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

-- Trigger to update document_sources updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_sources_updated_at
    BEFORE UPDATE ON document_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_documents_updated_at
    BEFORE UPDATE ON coach_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rag_query_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Initial data for testing
INSERT INTO document_sources (coach_id, source_name, source_type, metadata)
VALUES 
    ('carnivore', 'Carnivore Diet Beginner Guide', 'md', '{"access_tier": "free", "author": "CoachMeld Team"}'::jsonb),
    ('carnivore', 'Advanced Carnivore Protocols', 'pdf', '{"access_tier": "premium", "author": "Dr. Expert"}'::jsonb)
ON CONFLICT DO NOTHING;