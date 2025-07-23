-- Clean up all documents from RAG system
-- This will remove all documents and related data

-- First, disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Delete from dependent tables first
DELETE FROM document_usage_stats;
DELETE FROM coach_access_tiers;
DELETE FROM document_versions;
DELETE FROM rag_query_cache;

-- Delete main document data
DELETE FROM coach_documents;
DELETE FROM document_sources;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Verify cleanup
SELECT 'document_sources' as table_name, COUNT(*) as record_count FROM document_sources
UNION ALL
SELECT 'coach_documents', COUNT(*) FROM coach_documents
UNION ALL
SELECT 'coach_access_tiers', COUNT(*) FROM coach_access_tiers
UNION ALL
SELECT 'document_usage_stats', COUNT(*) FROM document_usage_stats;