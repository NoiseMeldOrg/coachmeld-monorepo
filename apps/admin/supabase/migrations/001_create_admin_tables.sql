-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create rag_documents table
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  diet_type TEXT NOT NULL DEFAULT 'shared',
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS rag_documents_diet_type_idx ON rag_documents(diet_type);
CREATE INDEX IF NOT EXISTS rag_documents_user_id_idx ON rag_documents(user_id);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);

-- Create knowledge_entries table
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  diet_type TEXT NOT NULL DEFAULT 'shared',
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge_versions table for version history
CREATE TABLE IF NOT EXISTS knowledge_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by TEXT,
  change_summary TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for knowledge base
CREATE INDEX IF NOT EXISTS knowledge_entries_diet_type_idx ON knowledge_entries(diet_type);
CREATE INDEX IF NOT EXISTS knowledge_entries_category_idx ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS knowledge_versions_entry_id_idx ON knowledge_versions(entry_id);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_diet_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  metadata jsonb,
  document_title text,
  document_diet_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.metadata,
    d.title as document_title,
    d.diet_type as document_diet_type
  FROM document_embeddings de
  JOIN rag_documents d ON de.document_id = d.id
  WHERE 
    1 - (de.embedding <=> query_embedding) > match_threshold
    AND (filter_diet_type IS NULL OR d.diet_type = filter_diet_type OR d.diet_type = 'shared')
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function to execute SQL (for migration runner) - ADMIN ONLY
CREATE OR REPLACE FUNCTION exec_migration(migration_sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow specific admin users (update email as needed)
  IF auth.uid() NOT IN (
    SELECT id FROM auth.users WHERE email IN ('admin@noisemeld.com')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Execute the SQL
  EXECUTE migration_sql;
  
  -- Return success
  result := json_build_object('success', true, 'message', 'Migration executed successfully');
  RETURN result;
END;
$$;

-- Create function to execute queries (for query console) - READ ONLY
CREATE OR REPLACE FUNCTION exec_sql(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  query_result json;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Only allow SELECT queries for safety
  IF NOT (lower(trim(query_text)) LIKE 'select%' OR lower(trim(query_text)) LIKE 'with%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Execute query and return results as JSON
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO query_result;
  
  result := json_build_object(
    'success', true,
    'rows', COALESCE(query_result, '[]'::json),
    'message', 'Query executed successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Query failed'
    );
    RETURN result;
END;
$$;

-- Grant permissions (adjust as needed for your security requirements)
GRANT ALL ON rag_documents TO authenticated;
GRANT ALL ON document_embeddings TO authenticated;
GRANT ALL ON analytics_events TO authenticated;
GRANT ALL ON knowledge_entries TO authenticated;
GRANT ALL ON knowledge_versions TO authenticated;

-- Create RLS policies (optional but recommended)
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_versions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed)
CREATE POLICY "Users can view all documents" ON rag_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own documents" ON rag_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON rag_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON rag_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view all embeddings" ON document_embeddings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage embeddings for own documents" ON document_embeddings FOR ALL TO authenticated 
  USING (document_id IN (SELECT id FROM rag_documents WHERE user_id = auth.uid()));

CREATE POLICY "Users can view all knowledge" ON knowledge_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage knowledge" ON knowledge_entries FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view analytics" ON analytics_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert analytics" ON analytics_events FOR INSERT TO authenticated WITH CHECK (true);