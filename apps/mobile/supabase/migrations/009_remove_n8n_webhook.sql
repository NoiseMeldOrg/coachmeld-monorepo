-- Migration: Remove N8N webhook URL from coaches table
-- Version: 009
-- Description: Removes n8n_webhook_url column as N8N is no longer part of the tech stack

-- Drop the n8n_webhook_url column if it exists
ALTER TABLE coaches 
DROP COLUMN IF EXISTS n8n_webhook_url;

-- Add a comment explaining the removal
COMMENT ON TABLE coaches IS 'AI coaches available in the system. Previously included n8n_webhook_url for webhook integration, but now uses direct Gemini API integration.';

-- Log the migration
INSERT INTO compliance_audit_log (
    event_type,
    entity_type,
    action,
    metadata
) VALUES (
    'schema_change',
    'coaches',
    'Removed n8n_webhook_url column - N8N no longer in tech stack',
    jsonb_build_object(
        'migration_version', '009',
        'removed_column', 'n8n_webhook_url',
        'reason', 'Switched to direct Gemini API integration'
    )
) ON CONFLICT DO NOTHING;