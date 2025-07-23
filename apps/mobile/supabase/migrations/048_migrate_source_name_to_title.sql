-- Migration: Migrate data from source_name to title column in document_sources
-- This migration addresses the issue where migration 028 added a 'title' column
-- but didn't migrate existing data from 'source_name' column

BEGIN;

-- Step 1: Check if source_name column exists before proceeding
DO $$
DECLARE
    v_count1 INTEGER;
    v_count2 INTEGER;
BEGIN
    -- Only proceed if source_name column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'document_sources' 
        AND column_name = 'source_name'
    ) THEN
        
        -- Step 2: Migrate data from source_name to title where title is NULL or default
        UPDATE document_sources
        SET title = source_name
        WHERE (title IS NULL OR title = 'Untitled')
        AND source_name IS NOT NULL
        AND source_name != '';
        
        GET DIAGNOSTICS v_count1 = ROW_COUNT;
        RAISE NOTICE 'Migrated % rows from source_name to title', v_count1;
        
        -- Step 3: Set sensible defaults for documents with no title in either column
        UPDATE document_sources
        SET title = CASE
            WHEN type = 'pdf' THEN 'PDF Document - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            WHEN type = 'text_file' THEN 'Text File - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            WHEN type = 'manual' THEN 'Manual Entry - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            WHEN type = 'structured_data' THEN 'Structured Data - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            WHEN type = 'user_context' THEN 'User Context - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            -- Handle legacy source_type values as well
            WHEN source_type = 'pdf' THEN 'PDF Document - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            WHEN source_type = 'txt' THEN 'Text File - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            WHEN source_type = 'url' THEN 'Web Content - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
            ELSE 'Document - ' || TO_CHAR(created_at, 'YYYY-MM-DD')
        END
        WHERE (title IS NULL OR title = 'Untitled' OR title = '')
        AND (source_name IS NULL OR source_name = '');
        
        GET DIAGNOSTICS v_count2 = ROW_COUNT;
        RAISE NOTICE 'Set default titles for % documents', v_count2;
        
        -- Step 4: Update the track_content_source function to use title instead of source_name
        CREATE OR REPLACE FUNCTION track_content_source(
            p_content_id UUID,
            p_source_id UUID
        ) RETURNS VOID AS $func$
        BEGIN
            -- Update the last_used timestamp for this source
            UPDATE document_sources
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{last_used}',
                to_jsonb(NOW())
            )
            WHERE id = p_source_id;
            
            -- Track which content came from which source
            INSERT INTO content_source_tracking (content_id, source_id)
            VALUES (p_content_id, p_source_id)
            ON CONFLICT (content_id, source_id) DO NOTHING;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Step 5: Drop constraints that reference source_name column
        ALTER TABLE document_sources DROP CONSTRAINT IF EXISTS document_sources_source_name_check;
        
        -- Step 6: Drop the source_name column as it's no longer needed
        ALTER TABLE document_sources DROP COLUMN source_name;
        
        RAISE NOTICE 'Successfully dropped source_name column';
        
    ELSE
        RAISE NOTICE 'source_name column does not exist, skipping migration';
    END IF;
    
    -- Step 7: Ensure title column has proper constraints
    -- Only add NOT NULL constraint if it doesn't already exist
    BEGIN
        ALTER TABLE document_sources ALTER COLUMN title SET NOT NULL;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Title column already has NOT NULL constraint or other constraint exists';
    END;
    
END $$;

-- Step 8: Update the updated_at timestamp for all modified rows
UPDATE document_sources 
SET updated_at = NOW() 
WHERE updated_at < NOW() - INTERVAL '1 minute';

COMMIT;

-- Add a comment to document this migration
COMMENT ON COLUMN document_sources.title IS 'The display name of the document source (migrated from source_name column)';