-- Check what tables exist in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for any tables with 'rag' or 'document' in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%rag%' OR table_name LIKE '%document%' OR table_name LIKE '%embed%')
ORDER BY table_name;

-- Check if there's a documents table
SELECT * FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'rag_documents', 'document_embeddings', 'embeddings')
ORDER BY table_name, ordinal_position;