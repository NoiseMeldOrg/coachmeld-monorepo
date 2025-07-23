-- Add unique constraint on source_url to prevent duplicate YouTube videos and web content
-- This ensures the same YouTube video or web page cannot be added multiple times

BEGIN;

-- First, create a temporary table to store which duplicates we're removing
CREATE TEMP TABLE duplicate_sources_to_remove AS
WITH duplicate_sources AS (
  SELECT
    id,
    source_url,
    title,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY created_at ASC) as rn
  FROM document_sources
  WHERE source_url IS NOT NULL AND source_url != ''
)
SELECT id, source_url, title
FROM duplicate_sources
WHERE rn > 1;

-- Log what we're about to remove
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM duplicate_sources_to_remove;
    IF v_count > 0 THEN
        RAISE NOTICE 'Found % duplicate source_urls that will be removed', v_count;
        RAISE NOTICE 'Keeping the oldest entry for each duplicate source_url';
    END IF;
END $$;

-- Delete related coach_documents entries first (due to foreign key constraint)
DELETE FROM coach_documents
WHERE source_id IN (SELECT id FROM duplicate_sources_to_remove);

-- Delete related entries from other tables that reference document_sources
DELETE FROM source_contributions
WHERE source_id IN (SELECT id FROM duplicate_sources_to_remove);

DELETE FROM content_audit_trail
WHERE source_id IN (SELECT id FROM duplicate_sources_to_remove);

-- Now delete the duplicate document_sources entries
DELETE FROM document_sources
WHERE id IN (SELECT id FROM duplicate_sources_to_remove);

-- Create a unique index on source_url for non-null values
-- This prevents future duplicates from being inserted
CREATE UNIQUE INDEX idx_unique_source_url
ON document_sources (source_url)
WHERE source_url IS NOT NULL AND source_url != '';

-- Add an index to improve lookup performance for source_url checks
CREATE INDEX IF NOT EXISTS idx_document_sources_source_url_lookup
ON document_sources (source_url)
WHERE source_url IS NOT NULL;

-- Add a comment to the table explaining the constraint
COMMENT ON INDEX idx_unique_source_url IS 'Ensures no duplicate YouTube videos or web pages can be added to the RAG system';

-- Clean up
DROP TABLE duplicate_sources_to_remove;

COMMIT;