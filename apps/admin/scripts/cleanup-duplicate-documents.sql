-- First, let's see the duplicates with their details
WITH duplicate_sources AS (
  SELECT 
    source_name,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(created_at ORDER BY created_at) as created_dates,
    array_agg(process_status ORDER BY created_at) as statuses
  FROM document_sources
  GROUP BY source_name
  HAVING COUNT(*) > 1
)
SELECT 
  source_name,
  ids[1] as older_id,
  ids[2] as newer_id,
  created_dates[1] as older_date,
  created_dates[2] as newer_date
FROM duplicate_sources;

-- To remove duplicates, we'll keep the older (original) ones and remove the newer ones
-- First, soft-delete the coach_documents for the newer duplicates
WITH duplicates_to_remove AS (
  SELECT 
    source_name,
    (array_agg(id ORDER BY created_at DESC))[1] as newer_id
  FROM document_sources
  GROUP BY source_name
  HAVING COUNT(*) > 1
)
UPDATE coach_documents
SET is_active = false
WHERE source_id IN (SELECT newer_id FROM duplicates_to_remove);

-- Then remove the newer document_sources entries
WITH duplicates_to_remove AS (
  SELECT 
    source_name,
    (array_agg(id ORDER BY created_at DESC))[1] as newer_id
  FROM document_sources
  GROUP BY source_name
  HAVING COUNT(*) > 1
)
DELETE FROM document_sources
WHERE id IN (SELECT newer_id FROM duplicates_to_remove);

-- Verify the cleanup worked
SELECT 
  source_name, 
  COUNT(*) as count
FROM document_sources
GROUP BY source_name
ORDER BY source_name;