-- Check what's in document_sources table
SELECT 'document_sources' as table_name, COUNT(*) as count
FROM document_sources;

-- Check what's in coach_documents table
SELECT 'coach_documents' as table_name, COUNT(*) as count
FROM coach_documents
WHERE is_active = true;

-- Check if there are any old rag_documents table entries
SELECT 'rag_documents' as table_name, COUNT(*) as count
FROM rag_documents;

-- List all document sources with their chunk counts
SELECT 
  ds.id,
  ds.source_name,
  ds.created_at,
  ds.process_status,
  COUNT(cd.id) as chunk_count
FROM document_sources ds
LEFT JOIN coach_documents cd ON cd.source_id = ds.id AND cd.is_active = true
GROUP BY ds.id, ds.source_name, ds.created_at, ds.process_status
ORDER BY ds.created_at DESC;

-- Check for duplicate source names
SELECT 
  source_name, 
  COUNT(*) as duplicate_count,
  string_agg(id::text, ', ') as source_ids
FROM document_sources
GROUP BY source_name
HAVING COUNT(*) > 1;