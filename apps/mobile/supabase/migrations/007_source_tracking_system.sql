-- Enhanced source tracking for partnerships and collaborations

-- Add tracking columns to document_sources
ALTER TABLE document_sources
ADD COLUMN IF NOT EXISTS supplied_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50) CHECK (supplier_type IN (
    'partner_doctor',
    'partner_coach', 
    'partner_company',
    'research_institution',
    'content_creator',
    'internal_team',
    'public_source',
    'user_submitted',
    'self_generated'
)) DEFAULT 'internal_team',
ADD COLUMN IF NOT EXISTS supplier_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS supplier_organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS acquisition_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS acquisition_method VARCHAR(50) CHECK (acquisition_method IN (
    'direct_upload',
    'email_submission',
    'api_integration',
    'manual_entry',
    'web_scraping',
    'partner_portal',
    'licensing_agreement'
)) DEFAULT 'manual_entry',
ADD COLUMN IF NOT EXISTS agreement_id UUID,
ADD COLUMN IF NOT EXISTS agreement_terms JSONB,
ADD COLUMN IF NOT EXISTS usage_permissions JSONB DEFAULT '{
    "can_modify": false,
    "can_redistribute": false,
    "requires_attribution": true,
    "exclusive_to_coachmeld": false,
    "expiration_date": null
}'::jsonb;

-- Partnership agreements table
CREATE TABLE IF NOT EXISTS partner_agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) CHECK (partner_type IN (
        'doctor',
        'coach',
        'company',
        'institution',
        'content_creator'
    )) NOT NULL,
    organization VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    agreement_type VARCHAR(50) CHECK (agreement_type IN (
        'content_license',
        'partnership',
        'collaboration',
        'sponsorship',
        'research_sharing'
    )) NOT NULL,
    agreement_status VARCHAR(20) CHECK (agreement_status IN (
        'draft',
        'pending',
        'active',
        'expired',
        'terminated'
    )) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    terms JSONB NOT NULL DEFAULT '{}'::jsonb,
    compensation_model VARCHAR(50) CHECK (compensation_model IN (
        'revenue_share',
        'flat_fee',
        'per_user',
        'free',
        'exchange'
    )),
    compensation_details JSONB,
    allowed_coaches TEXT[],
    content_categories TEXT[],
    notes TEXT,
    signed_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_partner_email UNIQUE (partner_name, contact_email)
);

-- Partner coaches (for tracking doctor/coach specific content)
CREATE TABLE IF NOT EXISTS partner_coaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    partner_id UUID REFERENCES partner_agreements(id) ON DELETE RESTRICT,
    coach_name VARCHAR(255) NOT NULL,
    coach_title VARCHAR(255), -- e.g., "MD", "PhD", "Certified Nutritionist"
    bio TEXT,
    credentials JSONB,
    specialties TEXT[],
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    launch_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_partner_coach UNIQUE (coach_id, partner_id)
);

-- Source contribution tracking
CREATE TABLE IF NOT EXISTS source_contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES document_sources(id) ON DELETE CASCADE,
    contributor_name VARCHAR(255) NOT NULL,
    contributor_role VARCHAR(100),
    contribution_type VARCHAR(50) CHECK (contribution_type IN (
        'author',
        'co-author',
        'editor',
        'reviewer',
        'translator',
        'provider'
    )) NOT NULL,
    contribution_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

-- Content audit trail
CREATE TABLE IF NOT EXISTS content_audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES document_sources(id) ON DELETE CASCADE,
    action VARCHAR(50) CHECK (action IN (
        'uploaded',
        'reviewed',
        'approved',
        'modified',
        'flagged',
        'removed'
    )) NOT NULL,
    action_by UUID REFERENCES auth.users(id),
    action_by_name VARCHAR(255), -- For external contributors
    action_date TIMESTAMPTZ DEFAULT NOW(),
    details JSONB,
    ip_address INET,
    
    INDEX idx_audit_source (source_id),
    INDEX idx_audit_date (action_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sources_supplier ON document_sources(supplied_by);
CREATE INDEX IF NOT EXISTS idx_sources_supplier_type ON document_sources(supplier_type);
CREATE INDEX IF NOT EXISTS idx_sources_agreement ON document_sources(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON partner_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_agreements_partner ON partner_agreements(partner_name);
CREATE INDEX IF NOT EXISTS idx_partner_coaches_active ON partner_coaches(is_active);

-- Enable RLS
ALTER TABLE partner_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage partner agreements" ON partner_agreements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND metadata->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can view audit trail" ON content_audit_trail
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND metadata->>'role' = 'admin'
        )
    );

-- Functions

-- Track content source with full attribution
CREATE OR REPLACE FUNCTION track_content_source(
    p_source_name TEXT,
    p_coach_id VARCHAR(50),
    p_supplied_by VARCHAR(255),
    p_supplier_type VARCHAR(50),
    p_supplier_email VARCHAR(255) DEFAULT NULL,
    p_agreement_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source_id UUID;
    v_user_name TEXT;
BEGIN
    -- Get current user name
    SELECT name INTO v_user_name
    FROM profiles
    WHERE id = auth.uid();

    -- Insert document source with tracking
    INSERT INTO document_sources (
        coach_id,
        source_name,
        source_type,
        supplied_by,
        supplier_type,
        supplier_email,
        agreement_id,
        acquisition_date,
        acquisition_method,
        metadata
    ) VALUES (
        p_coach_id,
        p_source_name,
        'pdf', -- default, can be parameterized
        p_supplied_by,
        p_supplier_type,
        p_supplier_email,
        p_agreement_id,
        CURRENT_DATE,
        'direct_upload',
        p_metadata || jsonb_build_object(
            'uploaded_by', auth.uid(),
            'uploaded_by_name', v_user_name,
            'upload_timestamp', NOW()
        )
    ) RETURNING id INTO v_source_id;

    -- Add audit trail entry
    INSERT INTO content_audit_trail (
        source_id,
        action,
        action_by,
        action_by_name,
        details
    ) VALUES (
        v_source_id,
        'uploaded',
        auth.uid(),
        v_user_name,
        jsonb_build_object(
            'supplier', p_supplied_by,
            'supplier_type', p_supplier_type
        )
    );

    RETURN v_source_id;
END;
$$;

-- Get source provenance (full tracking history)
CREATE OR REPLACE FUNCTION get_source_provenance(p_source_id UUID)
RETURNS TABLE (
    source_name TEXT,
    supplied_by VARCHAR(255),
    supplier_type VARCHAR(50),
    supplier_organization VARCHAR(255),
    acquisition_date DATE,
    agreement_status VARCHAR(20),
    partner_name VARCHAR(255),
    contributors JSONB,
    audit_trail JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.source_name,
        ds.supplied_by,
        ds.supplier_type,
        ds.supplier_organization,
        ds.acquisition_date,
        pa.agreement_status,
        pa.partner_name,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'name', contributor_name,
                'role', contributor_role,
                'type', contribution_type
            ))
            FROM source_contributions
            WHERE source_id = p_source_id
        ) as contributors,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'action', action,
                'date', action_date,
                'by', action_by_name,
                'details', details
            ) ORDER BY action_date DESC)
            FROM content_audit_trail
            WHERE source_id = p_source_id
        ) as audit_trail
    FROM document_sources ds
    LEFT JOIN partner_agreements pa ON ds.agreement_id = pa.id
    WHERE ds.id = p_source_id;
END;
$$;

-- Trigger to update audit trail
CREATE OR REPLACE FUNCTION audit_source_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO content_audit_trail (
            source_id,
            action,
            action_by,
            details
        ) VALUES (
            NEW.id,
            'modified',
            auth.uid(),
            jsonb_build_object(
                'changed_fields', (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(to_jsonb(NEW))
                    WHERE to_jsonb(OLD) -> key IS DISTINCT FROM value
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_source_changes
    AFTER UPDATE ON document_sources
    FOR EACH ROW
    EXECUTE FUNCTION audit_source_changes();

-- Sample data for partner tracking
INSERT INTO partner_agreements (
    partner_name,
    partner_type,
    organization,
    contact_email,
    agreement_type,
    agreement_status,
    terms,
    allowed_coaches
) VALUES 
(
    'Dr. Shawn Baker',
    'doctor',
    'MeatRx',
    'contact@meatrx.com',
    'content_license',
    'active',
    jsonb_build_object(
        'content_types', ARRAY['research', 'protocols', 'case_studies'],
        'attribution_required', true,
        'exclusive_content', false
    ),
    ARRAY['carnivore']
),
(
    'Example Fitness Company',
    'company',
    'FitTech Solutions',
    'partners@fittech.com',
    'partnership',
    'pending',
    jsonb_build_object(
        'content_types', ARRAY['workout_plans', 'nutrition_guides'],
        'revenue_share', 0.2
    ),
    ARRAY['fitness']
)
ON CONFLICT DO NOTHING;