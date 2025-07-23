-- Check CoachMeld's actual document tables
-- Based on the search results, CoachMeld uses different table names

-- 1. Check if coach_documents table exists (main document table in CoachMeld)
SELECT COUNT(*) as coach_documents_count 
FROM coach_documents;

-- 2. Check if document_sources table exists
SELECT COUNT(*) as document_sources_count 
FROM document_sources;

-- 3. Check the structure of coach_documents table
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'coach_documents'
ORDER BY ordinal_position;

-- 4. Check the structure of document_sources table
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'document_sources'
ORDER BY ordinal_position;

-- 5. Get sample data from coach_documents
SELECT id, source_id, title, content, chunk_index, total_chunks, created_at
FROM coach_documents
LIMIT 5;

-- 6. Get sample data from document_sources
SELECT id, source_name, source_type, created_at
FROM document_sources
LIMIT 5;

-- 7. Check for any other document-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%document%' 
    OR table_name LIKE '%embed%' 
    OR table_name LIKE '%rag%'
    OR table_name LIKE '%coach%'
)
ORDER BY table_name;