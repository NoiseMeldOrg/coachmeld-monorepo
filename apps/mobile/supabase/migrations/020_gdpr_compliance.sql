-- GDPR Compliance Tables for CoachMeld
-- This migration adds support for GDPR compliance features

-- Add GDPR consent fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN DEFAULT true;

-- Consent history tracking
CREATE TABLE IF NOT EXISTS consent_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN (
        'data_processing',
        'marketing',
        'analytics', 
        'cookies',
        'third_party_sharing'
    )),
    action VARCHAR(20) NOT NULL CHECK (action IN ('granted', 'withdrawn')),
    version VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data export requests for GDPR Article 15 (Right to Access)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'expired'
    )),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    export_url TEXT,
    expires_at TIMESTAMPTZ,
    file_size_bytes BIGINT,
    error_message TEXT
);

-- Deletion requests for GDPR Article 17 (Right to be Forgotten)
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'scheduled',
        'processing',
        'completed',
        'cancelled'
    )),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    reason TEXT,
    confirmation_token UUID DEFAULT gen_random_uuid()
);

-- Privacy settings for granular control
CREATE TABLE IF NOT EXISTS privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    show_profile_to_coaches BOOLEAN DEFAULT true,
    share_progress_anonymously BOOLEAN DEFAULT true,
    receive_tips_notifications BOOLEAN DEFAULT true,
    receive_marketing_emails BOOLEAN DEFAULT false,
    allow_data_for_research BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consent_history_user ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_type ON consent_history(consent_type);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);

-- Enable RLS
ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own consent history
CREATE POLICY "Users can view own consent history" ON consent_history
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own consent records
CREATE POLICY "Users can manage own consents" ON consent_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view their own export requests
CREATE POLICY "Users can view own export requests" ON data_export_requests
    FOR SELECT USING (user_id = auth.uid());

-- Users can create export requests
CREATE POLICY "Users can request data export" ON data_export_requests
    FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests" ON deletion_requests
    FOR SELECT USING (user_id = auth.uid());

-- Users can create deletion requests
CREATE POLICY "Users can request deletion" ON deletion_requests
    FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Users can cancel their own pending deletion requests
CREATE POLICY "Users can cancel deletion" ON deletion_requests
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (status = 'cancelled');

-- Users can manage their own privacy settings
CREATE POLICY "Users can manage privacy settings" ON privacy_settings
    FOR ALL USING (user_id = auth.uid());

-- Functions

-- Function to record consent
CREATE OR REPLACE FUNCTION record_consent(
    p_consent_type TEXT,
    p_action TEXT,
    p_version TEXT DEFAULT '1.0',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_consent_id UUID;
BEGIN
    -- Insert consent record
    INSERT INTO consent_history (
        user_id,
        consent_type,
        action,
        version,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        p_consent_type,
        p_action,
        p_version,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO v_consent_id;
    
    -- Update profile if data processing consent
    IF p_consent_type = 'data_processing' THEN
        UPDATE profiles
        SET 
            gdpr_consent_date = CASE WHEN p_action = 'granted' THEN NOW() ELSE gdpr_consent_date END,
            data_processing_consent = (p_action = 'granted')
        WHERE id = auth.uid();
    END IF;
    
    -- Update profile for other consent types
    IF p_consent_type = 'marketing' THEN
        UPDATE profiles
        SET marketing_consent = (p_action = 'granted')
        WHERE id = auth.uid();
    ELSIF p_consent_type = 'analytics' THEN
        UPDATE profiles
        SET analytics_consent = (p_action = 'granted')
        WHERE id = auth.uid();
    END IF;
    
    RETURN v_consent_id;
END;
$$;

-- Function to request data export
CREATE OR REPLACE FUNCTION request_data_export()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id UUID;
    v_pending_count INTEGER;
BEGIN
    -- Check for existing pending requests
    SELECT COUNT(*)
    INTO v_pending_count
    FROM data_export_requests
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'processing');
    
    IF v_pending_count > 0 THEN
        RAISE EXCEPTION 'You already have a pending export request';
    END IF;
    
    -- Create new request
    INSERT INTO data_export_requests (user_id)
    VALUES (auth.uid())
    RETURNING id INTO v_request_id;
    
    -- Log the request
    PERFORM log_compliance_event(
        'data_export_requested',
        'user',
        auth.uid(),
        'User requested data export'
    );
    
    RETURN v_request_id;
END;
$$;

-- Function to request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(p_reason TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id UUID;
    v_pending_count INTEGER;
BEGIN
    -- Check for existing pending requests
    SELECT COUNT(*)
    INTO v_pending_count
    FROM deletion_requests
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'scheduled');
    
    IF v_pending_count > 0 THEN
        RAISE EXCEPTION 'You already have a pending deletion request';
    END IF;
    
    -- Create new request
    INSERT INTO deletion_requests (user_id, reason)
    VALUES (auth.uid(), p_reason)
    RETURNING id INTO v_request_id;
    
    -- Log the request
    PERFORM log_compliance_event(
        'deletion_requested',
        'user',
        auth.uid(),
        'User requested account deletion',
        jsonb_build_object('reason', p_reason)
    );
    
    RETURN v_request_id;
END;
$$;

-- Trigger to update privacy_settings timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_privacy_settings_timestamp
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_privacy_settings_timestamp();

-- Default privacy settings for new users
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO privacy_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_privacy_settings
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_privacy_settings();