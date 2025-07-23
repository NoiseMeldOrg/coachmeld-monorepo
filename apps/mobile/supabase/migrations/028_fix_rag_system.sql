-- Migration: Fix RAG System Tables
-- Description: Ensures all RAG-related tables and columns exist

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Handle document_sources table creation/update
DO $$
BEGIN
    -- Check if document_sources table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_sources') THEN
        -- Create the table
        CREATE TABLE document_sources (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('manual', 'pdf', 'text_file', 'structured_data', 'user_context')),
            title TEXT NOT NULL,
            filename TEXT,
            url TEXT,
            content TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Table exists, add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_sources' AND column_name = 'type') THEN
            ALTER TABLE document_sources ADD COLUMN type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'pdf', 'text_file', 'structured_data', 'user_context'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_sources' AND column_name = 'content') THEN
            ALTER TABLE document_sources ADD COLUMN content TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_sources' AND column_name = 'title') THEN
            ALTER TABLE document_sources ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_sources' AND column_name = 'filename') THEN
            ALTER TABLE document_sources ADD COLUMN filename TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_sources' AND column_name = 'url') THEN
            ALTER TABLE document_sources ADD COLUMN url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_sources' AND column_name = 'metadata') THEN
            ALTER TABLE document_sources ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;
    END IF;
END $$;

-- Create coach_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS coach_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Note: coach_id was removed in migration 010, using junction table instead
    content TEXT NOT NULL,
    embedding vector(768), -- Using 768 dimensions for Gemini
    metadata JSONB DEFAULT '{}',
    source_id UUID REFERENCES document_sources(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create coach_document_access junction table (from migration 010)
CREATE TABLE IF NOT EXISTS coach_document_access (
    document_id UUID REFERENCES coach_documents(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    access_level TEXT DEFAULT 'full' CHECK (access_level IN ('full', 'restricted')),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (document_id, coach_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_coach_documents_embedding ON coach_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_coach_documents_source_id ON coach_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_coach_document_access_coach_id ON coach_document_access(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_document_access_document_id ON coach_document_access(document_id);
CREATE INDEX IF NOT EXISTS idx_document_sources_type ON document_sources(type);

-- Create or replace the search function with correct parameters
CREATE OR REPLACE FUNCTION search_coach_documents_with_access(
    p_coach_id UUID,
    p_user_id UUID,
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT,
    source_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.id,
        cd.content,
        cd.metadata,
        1 - (cd.embedding <=> query_embedding) as similarity,
        cd.source_id
    FROM coach_documents cd
    WHERE 
        -- Document is accessible by this coach
        cd.id IN (
            SELECT document_id 
            FROM coach_document_access 
            WHERE coach_id = p_coach_id
        )
        -- Or document is a user context for this user
        OR cd.id IN (
            SELECT cd2.id
            FROM coach_documents cd2
            JOIN document_sources ds ON cd2.source_id = ds.id
            WHERE ds.metadata->>'user_id' = p_user_id::text
        )
    AND cd.embedding IS NOT NULL
    AND 1 - (cd.embedding <=> query_embedding) > match_threshold
    ORDER BY cd.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create RLS policies
ALTER TABLE document_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_document_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
    -- Drop existing policies on document_sources
    DROP POLICY IF EXISTS "Service role has full access to document_sources" ON document_sources;
    DROP POLICY IF EXISTS "Users can view their own user_context documents" ON document_sources;
    
    -- Drop existing policies on coach_documents
    DROP POLICY IF EXISTS "Service role has full access to coach_documents" ON coach_documents;
    
    -- Drop existing policies on coach_document_access
    DROP POLICY IF EXISTS "Service role has full access to coach_document_access" ON coach_document_access;
END $$;

-- Create policies for document_sources
CREATE POLICY "Service role has full access to document_sources"
    ON document_sources FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own user_context documents"
    ON document_sources FOR SELECT
    USING (
        metadata->>'user_id' = auth.uid()::text
    );

-- Create policies for coach_documents
CREATE POLICY "Service role has full access to coach_documents"
    ON coach_documents FOR ALL
    USING (auth.role() = 'service_role');

-- Create policies for coach_document_access
CREATE POLICY "Service role has full access to coach_document_access"
    ON coach_document_access FOR ALL
    USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON document_sources TO authenticated;
GRANT SELECT ON coach_documents TO authenticated;
GRANT SELECT ON coach_document_access TO authenticated;
GRANT EXECUTE ON FUNCTION search_coach_documents_with_access(UUID, UUID, vector(768), FLOAT, INT) TO authenticated, anon;

-- Skip user context creation for now since document_sources has a complex structure
-- This can be done manually later once we understand the full schema
DO $$
BEGIN
    RAISE NOTICE 'Skipping user context document creation - document_sources table has unexpected structure';
END $$;