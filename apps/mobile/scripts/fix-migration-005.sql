-- Add optional original document storage to the RAG system
-- This migration adds the ability to store original documents

-- Create storage bucket for original documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-documents', 'rag-documents', false)
ON CONFLICT DO NOTHING;

-- Add columns to document_sources for original file storage
ALTER TABLE document_sources
ADD COLUMN IF NOT EXISTS store_original BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_file_path TEXT,
ADD COLUMN IF NOT EXISTS original_content TEXT,
ADD COLUMN IF NOT EXISTS storage_method VARCHAR(20) CHECK (storage_method IN ('file', 'text', 'none')) DEFAULT 'none';

-- Create table for document storage preferences
CREATE TABLE IF NOT EXISTS rag_storage_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id VARCHAR(50) UNIQUE NOT NULL,
    store_originals_default BOOLEAN DEFAULT false,
    storage_method_default VARCHAR(20) CHECK (storage_method_default IN ('file', 'text', 'none')) DEFAULT 'none',
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'txt', 'md', 'docx'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to store original document
CREATE OR REPLACE FUNCTION store_original_document(
    p_source_id UUID,
    p_file_name TEXT,
    p_file_content BYTEA,
    p_storage_method VARCHAR DEFAULT 'file'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_file_path TEXT;
    v_coach_id VARCHAR(50);
BEGIN
    -- Get coach_id for this source
    SELECT coach_id INTO v_coach_id
    FROM document_sources
    WHERE id = p_source_id;
    
    IF p_storage_method = 'file' THEN
        -- Store in Supabase Storage
        v_file_path := 'coaches/' || v_coach_id || '/' || p_source_id || '/' || p_file_name;
        
        -- Note: Actual file upload would happen via Supabase client
        -- This just returns the path where it should be stored
        
        UPDATE document_sources
        SET 
            store_original = true,
            original_file_path = v_file_path,
            storage_method = 'file'
        WHERE id = p_source_id;
        
        RETURN v_file_path;
    ELSIF p_storage_method = 'text' THEN
        -- Store as text in database (good for small files)
        UPDATE document_sources
        SET 
            store_original = true,
            original_content = convert_from(p_file_content, 'UTF8'),
            storage_method = 'text'
        WHERE id = p_source_id;
        
        RETURN 'Stored in database';
    ELSE
        RETURN 'No storage requested';
    END IF;
END;
$$;

-- Function to retrieve original document
CREATE OR REPLACE FUNCTION get_original_document(p_source_id UUID)
RETURNS TABLE (
    storage_method VARCHAR,
    file_path TEXT,
    content TEXT,
    title TEXT,
    source_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.storage_method,
        ds.original_file_path,
        ds.original_content,
        ds.title,
        ds.source_type
    FROM document_sources ds
    WHERE ds.id = p_source_id
    AND ds.store_original = true;
END;
$$;

-- RLS policies for storage bucket
-- NOTE: For now, we'll allow authenticated users to manage documents
-- You can add an admin system later
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'rag-documents' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'rag-documents' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update their documents" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'rag-documents' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete their documents" ON storage.objects
FOR DELETE USING (
    bucket_id = 'rag-documents' AND 
    auth.uid() IS NOT NULL
);

-- RLS policy for storage preferences
ALTER TABLE rag_storage_preferences ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users to manage storage preferences
CREATE POLICY "Authenticated users can manage storage preferences" ON rag_storage_preferences
FOR ALL USING (auth.uid() IS NOT NULL);

-- Update trigger for storage preferences
CREATE TRIGGER update_storage_preferences_updated_at
    BEFORE UPDATE ON rag_storage_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Default storage preferences for existing coaches
INSERT INTO rag_storage_preferences (coach_id, store_originals_default, storage_method_default)
VALUES 
    ('carnivore', false, 'none'),
    ('fitness', false, 'none'),
    ('mindfulness', false, 'none')
ON CONFLICT DO NOTHING;

-- Add comment explaining the storage options
COMMENT ON TABLE rag_storage_preferences IS 'Controls whether original documents are stored when added to RAG system. storage_method: file = Supabase Storage (good for PDFs), text = database column (good for small text files), none = dont store';

COMMENT ON COLUMN document_sources.store_original IS 'Whether the original document is stored for this source';
COMMENT ON COLUMN document_sources.storage_method IS 'How the original is stored: file (Supabase Storage), text (database), or none';