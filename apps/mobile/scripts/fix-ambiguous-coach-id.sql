-- Fix the ambiguous column reference in add_coach_document_access function
-- Run this AFTER the main migration (010_shared_documents.sql)

CREATE OR REPLACE FUNCTION add_coach_document_access(
    p_document_id UUID,
    p_coach_ids TEXT[],
    p_access_tier VARCHAR(20) DEFAULT 'free'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_coach_id TEXT;  -- Renamed to avoid ambiguity
    insert_count INTEGER := 0;
BEGIN
    FOREACH v_coach_id IN ARRAY p_coach_ids
    LOOP
        INSERT INTO coach_document_access (coach_id, document_id, access_tier)
        VALUES (v_coach_id, p_document_id, p_access_tier)
        ON CONFLICT (coach_id, document_id) 
        DO UPDATE SET access_tier = EXCLUDED.access_tier;
        
        insert_count := insert_count + 1;
    END LOOP;
    
    RETURN insert_count;
END;
$$;