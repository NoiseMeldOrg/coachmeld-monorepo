-- Additional verification queries

-- Check if coach_id columns were dropped
SELECT 
    table_name,
    column_name 
FROM information_schema.columns 
WHERE table_name IN ('document_sources', 'coach_documents') 
AND column_name = 'coach_id';
-- Should return 0 rows if migration was successful

-- Check if junction table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'coach_document_access'
ORDER BY ordinal_position;

-- Check if the search function was updated
SELECT 
    routine_name,
    routine_definition LIKE '%coach_document_access%' as uses_junction_table
FROM information_schema.routines
WHERE routine_name = 'search_coach_documents';