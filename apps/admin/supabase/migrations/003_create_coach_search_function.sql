-- First, check what search_coach_documents functions exist
-- Run this to see all overloaded versions:
-- SELECT proname, pg_get_function_identity_arguments(oid) 
-- FROM pg_proc 
-- WHERE proname = 'search_coach_documents';

-- Drop all possible versions of the function
DROP FUNCTION IF EXISTS search_coach_documents CASCADE;
DROP FUNCTION IF EXISTS search_coach_documents(vector(768));
DROP FUNCTION IF EXISTS search_coach_documents(vector(768), float);
DROP FUNCTION IF EXISTS search_coach_documents(vector(768), float, int);
DROP FUNCTION IF EXISTS search_coach_documents(vector(768), float, int, text);
DROP FUNCTION IF EXISTS search_coach_documents(vector, float, int);

-- Create vector similarity search function for CoachMeld documents
CREATE FUNCTION search_coach_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  title text,
  content text,
  similarity float,
  chunk_index int,
  total_chunks int,
  metadata jsonb,
  source_name text,
  source_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.id,
    cd.source_id,
    cd.title,
    cd.content,
    1 - (cd.embedding <=> query_embedding) as similarity,
    cd.chunk_index,
    cd.total_chunks,
    cd.metadata,
    ds.source_name,
    ds.source_type
  FROM coach_documents cd
  JOIN document_sources ds ON cd.source_id = ds.id
  WHERE 
    cd.is_active = true
    AND cd.embedding IS NOT NULL
    AND 1 - (cd.embedding <=> query_embedding) > match_threshold
  ORDER BY cd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_coach_documents(vector(768), float, int) TO authenticated;