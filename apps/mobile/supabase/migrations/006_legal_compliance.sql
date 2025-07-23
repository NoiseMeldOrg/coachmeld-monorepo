-- Legal compliance tracking for CoachMeld

-- Track user disclaimer acceptances
CREATE TABLE IF NOT EXISTS disclaimer_acceptances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    disclaimer_type VARCHAR(50) NOT NULL CHECK (disclaimer_type IN (
        'general_medical',
        'carnivore_diet',
        'fitness_exercise', 
        'discipleship_spiritual',
        'terms_of_service',
        'privacy_policy'
    )),
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    CONSTRAINT unique_user_disclaimer_version UNIQUE (user_id, disclaimer_type, version)
);

-- Track document source legality
ALTER TABLE document_sources
ADD COLUMN IF NOT EXISTS license_type VARCHAR(50) CHECK (license_type IN (
    'public_domain',
    'cc_by',
    'cc_by_sa',
    'cc_by_nc',
    'proprietary',
    'fair_use',
    'licensed',
    'user_submitted',
    'personal_notes',
    'youtube_transcript'
)) DEFAULT 'proprietary',
ADD COLUMN IF NOT EXISTS copyright_holder TEXT DEFAULT 'NoiseMeld',
ADD COLUMN IF NOT EXISTS permission_status VARCHAR(20) CHECK (permission_status IN (
    'not_required',
    'granted',
    'pending',
    'denied'
)) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS attribution_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS usage_restrictions JSONB DEFAULT '[]'::jsonb;

-- Content moderation flags
CREATE TABLE IF NOT EXISTS content_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES coach_documents(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) CHECK (flag_type IN (
        'copyright_concern',
        'medical_misinformation',
        'harmful_content',
        'outdated_information',
        'user_reported'
    )) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'reviewing', 'resolved', 'escalated')) DEFAULT 'pending',
    reported_by UUID REFERENCES auth.users(id),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    resolution TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Legal compliance audit log
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency medical disclaimer shown tracking
CREATE TABLE IF NOT EXISTS emergency_disclaimer_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    coach_id VARCHAR(50),
    context VARCHAR(100),
    shown_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disclaimer_acceptances_user ON disclaimer_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_disclaimer_acceptances_type ON disclaimer_acceptances(disclaimer_type);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);
CREATE INDEX IF NOT EXISTS idx_content_flags_document ON content_flags(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_event ON compliance_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_user ON compliance_audit_log(user_id);

-- Enable RLS
ALTER TABLE disclaimer_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_disclaimer_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own disclaimer acceptances
CREATE POLICY "Users can view own disclaimer acceptances" ON disclaimer_acceptances
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own disclaimer acceptances
CREATE POLICY "Users can accept disclaimers" ON disclaimer_acceptances
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Authenticated users can report content
CREATE POLICY "Users can flag content" ON content_flags
    FOR INSERT WITH CHECK (
        reported_by = auth.uid() AND
        status = 'pending'
    );

-- Users can view their own flags
CREATE POLICY "Users can view own flags" ON content_flags
    FOR SELECT USING (reported_by = auth.uid());

-- Admins can manage all flags
CREATE POLICY "Admins can manage flags" ON content_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND metadata->>'role' = 'admin'
        )
    );

-- Compliance audit log is admin only
CREATE POLICY "Admins can view audit log" ON compliance_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND metadata->>'role' = 'admin'
        )
    );

-- Functions

-- Function to check if user has accepted required disclaimers
CREATE OR REPLACE FUNCTION check_user_disclaimers(
    p_user_id UUID,
    p_required_disclaimers TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_accepted_count INTEGER;
    v_required_count INTEGER;
BEGIN
    v_required_count := array_length(p_required_disclaimers, 1);
    
    SELECT COUNT(DISTINCT disclaimer_type)
    INTO v_accepted_count
    FROM disclaimer_acceptances
    WHERE user_id = p_user_id
    AND disclaimer_type = ANY(p_required_disclaimers)
    AND version = (
        SELECT MAX(version)
        FROM disclaimer_acceptances da2
        WHERE da2.disclaimer_type = disclaimer_acceptances.disclaimer_type
    );
    
    RETURN v_accepted_count >= v_required_count;
END;
$$;

-- Function to log compliance events
CREATE OR REPLACE FUNCTION log_compliance_event(
    p_event_type TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO compliance_audit_log (
        event_type,
        entity_type,
        entity_id,
        user_id,
        action,
        metadata
    ) VALUES (
        p_event_type,
        p_entity_type,
        p_entity_id,
        auth.uid(),
        p_action,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Trigger to log disclaimer acceptances
CREATE OR REPLACE FUNCTION log_disclaimer_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_compliance_event(
        'disclaimer_accepted',
        'disclaimer',
        NEW.id,
        'User accepted ' || NEW.disclaimer_type || ' version ' || NEW.version,
        jsonb_build_object(
            'ip_address', NEW.ip_address,
            'user_agent', NEW.user_agent
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_disclaimer_acceptance
    AFTER INSERT ON disclaimer_acceptances
    FOR EACH ROW
    EXECUTE FUNCTION log_disclaimer_acceptance();

-- Default disclaimer versions
INSERT INTO disclaimer_acceptances (user_id, disclaimer_type, version)
SELECT 
    id,
    'general_medical',
    '1.0'
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM disclaimer_acceptances
    WHERE user_id = auth.users.id
    AND disclaimer_type = 'general_medical'
)
ON CONFLICT DO NOTHING;