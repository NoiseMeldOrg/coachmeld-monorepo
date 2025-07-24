-- GDPR Compliance Schema Implementation
-- Migration: 056_gdpr_compliance_schema.sql
-- Purpose: Implement comprehensive GDPR compliance database schema
-- Created: 2025-07-24

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create gdpr_consent_records table
CREATE TABLE IF NOT EXISTS gdpr_consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- 'data_processing', 'analytics', 'marketing'
  consent_given BOOLEAN NOT NULL,
  legal_basis VARCHAR(100) NOT NULL, -- 'consent', 'legitimate_interest', 'contract'
  ip_address INET,
  user_agent TEXT,
  consent_text TEXT NOT NULL, -- The exact consent text shown to user
  version VARCHAR(10) NOT NULL, -- Version of privacy policy/terms
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for gdpr_consent_records
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_user_id ON gdpr_consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_type ON gdpr_consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_created_at ON gdpr_consent_records(created_at);

-- 2. Create gdpr_data_requests table
CREATE TABLE IF NOT EXISTS gdpr_data_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('export', 'deletion', 'correction')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  request_details JSONB, -- Additional request parameters
  processed_by UUID REFERENCES profiles(id), -- Admin who processed
  processed_at TIMESTAMP WITH TIME ZONE,
  export_url TEXT, -- For export requests
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for gdpr_data_requests
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_data_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_data_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON gdpr_data_requests(created_at);

-- 3. Create data_processing_records table
CREATE TABLE IF NOT EXISTS data_processing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_category VARCHAR(100) NOT NULL, -- 'profile_data', 'health_metrics', 'chat_history'
  processing_purpose VARCHAR(200) NOT NULL,
  legal_basis VARCHAR(100) NOT NULL,
  data_sources TEXT[], -- Array of data source descriptions
  retention_period VARCHAR(50) NOT NULL, -- '2_years', '7_years', 'until_deletion'
  third_party_sharing BOOLEAN DEFAULT FALSE,
  third_parties TEXT[], -- Array of third party names if applicable
  security_measures TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data_processing_records
CREATE INDEX IF NOT EXISTS idx_data_processing_category ON data_processing_records(data_category);
CREATE INDEX IF NOT EXISTS idx_data_processing_active ON data_processing_records(is_active);

-- 4. Create gdpr_audit_log table
CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'consent_given', 'data_exported', 'account_deleted'
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  admin_user_id UUID REFERENCES profiles(id), -- If performed by admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for gdpr_audit_log
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_user_id ON gdpr_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_action ON gdpr_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_created_at ON gdpr_audit_log(created_at);

-- 5. Add GDPR-related columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent_version VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_eu_user BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_retention_date TIMESTAMP WITH TIME ZONE;

-- 6. Enable Row Level Security on new tables
ALTER TABLE gdpr_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_log ENABLE ROW LEVEL SECURITY;

-- 7. Create Row Level Security Policies

-- gdpr_consent_records policies
CREATE POLICY "Users can view own consent records" ON gdpr_consent_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent records" ON gdpr_consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent records" ON gdpr_consent_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consent records" ON gdpr_consent_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- gdpr_data_requests policies
CREATE POLICY "Users can manage own GDPR requests" ON gdpr_data_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all GDPR requests" ON gdpr_data_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- data_processing_records policies (read-only for users, full access for admins)
CREATE POLICY "Users can view data processing records" ON data_processing_records
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage data processing records" ON data_processing_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- gdpr_audit_log policies
CREATE POLICY "Users can view own audit logs" ON gdpr_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON gdpr_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert audit logs" ON gdpr_audit_log
  FOR INSERT WITH CHECK (true); -- Allow system to insert audit logs

-- 8. Create database functions for common GDPR operations

-- Function to log GDPR actions
CREATE OR REPLACE FUNCTION log_gdpr_action(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO gdpr_audit_log (
    user_id, action, details, ip_address, user_agent, admin_user_id
  ) VALUES (
    p_user_id, p_action, p_details, p_ip_address, p_user_agent, p_admin_user_id
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current consent status
CREATE OR REPLACE FUNCTION get_user_consent_status(p_user_id UUID)
RETURNS TABLE (
  consent_type VARCHAR(50),
  consent_given BOOLEAN,
  legal_basis VARCHAR(100),
  version VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (gcr.consent_type)
    gcr.consent_type,
    gcr.consent_given,
    gcr.legal_basis,
    gcr.version,
    gcr.created_at
  FROM gdpr_consent_records gcr
  WHERE gcr.user_id = p_user_id
  ORDER BY gcr.consent_type, gcr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has given specific consent
CREATE OR REPLACE FUNCTION has_user_consent(
  p_user_id UUID,
  p_consent_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  consent_status BOOLEAN := FALSE;
BEGIN
  SELECT consent_given INTO consent_status
  FROM gdpr_consent_records
  WHERE user_id = p_user_id 
    AND consent_type = p_consent_type
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(consent_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate data retention deadline
CREATE OR REPLACE FUNCTION calculate_retention_deadline(
  p_retention_period VARCHAR(50),
  p_reference_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  CASE p_retention_period
    WHEN '2_years' THEN
      RETURN p_reference_date + INTERVAL '2 years';
    WHEN '7_years' THEN
      RETURN p_reference_date + INTERVAL '7 years';
    WHEN '2_years_after_deletion' THEN
      -- Will be calculated when user requests deletion
      RETURN p_reference_date + INTERVAL '2 years';
    WHEN 'until_deletion' THEN
      -- No automatic expiry
      RETURN NULL;
    ELSE
      -- Default to 2 years for unknown periods
      RETURN p_reference_date + INTERVAL '2 years';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Create triggers for automatic updated_at timestamps

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER gdpr_consent_records_updated_at 
  BEFORE UPDATE ON gdpr_consent_records 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gdpr_data_requests_updated_at 
  BEFORE UPDATE ON gdpr_data_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER data_processing_records_updated_at 
  BEFORE UPDATE ON data_processing_records 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Populate initial data processing records
INSERT INTO data_processing_records (
  data_category, 
  processing_purpose, 
  legal_basis, 
  retention_period,
  data_sources,
  security_measures
) VALUES
  (
    'profile_data',
    'User account management and authentication',
    'contract',
    '2_years_after_deletion',
    ARRAY['User registration form', 'Profile updates'],
    ARRAY['Encryption at rest', 'TLS in transit', 'Row Level Security']
  ),
  (
    'health_metrics',
    'Personalized coaching recommendations and progress tracking',
    'consent',
    '2_years_after_deletion',
    ARRAY['User input forms', 'Progress tracking'],
    ARRAY['Encryption at rest', 'TLS in transit', 'User consent required']
  ),
  (
    'chat_history',
    'AI coaching conversation context and improvement',
    'consent',
    '2_years_after_deletion',
    ARRAY['Chat interface', 'AI coaching sessions'],
    ARRAY['Encryption at rest', 'TLS in transit', 'Anonymization possible']
  ),
  (
    'payment_data',
    'Subscription billing and payment processing',
    'contract',
    '7_years',
    ARRAY['Stripe payment processor', 'Subscription management'],
    ARRAY['PCI DSS compliance', 'Stripe security', 'Minimal data retention']
  ),
  (
    'usage_analytics',
    'App performance improvement and user experience optimization',
    'legitimate_interest',
    '2_years',
    ARRAY['App usage tracking', 'Performance monitoring'],
    ARRAY['Data aggregation', 'No personal identification', 'Pseudonymization']
  )
ON CONFLICT DO NOTHING;

-- 11. Create indexes for performance optimization on new columns
CREATE INDEX IF NOT EXISTS idx_profiles_is_eu_user ON profiles(is_eu_user);
CREATE INDEX IF NOT EXISTS idx_profiles_gdpr_consent_version ON profiles(gdpr_consent_version);
CREATE INDEX IF NOT EXISTS idx_profiles_data_retention_date ON profiles(data_retention_date);

-- 12. Add comments for documentation
COMMENT ON TABLE gdpr_consent_records IS 'Stores user consent records for GDPR compliance with full audit trail';
COMMENT ON TABLE gdpr_data_requests IS 'Tracks GDPR data subject requests (export, deletion, correction) with status';
COMMENT ON TABLE data_processing_records IS 'Documents data processing activities for GDPR Article 30 compliance';
COMMENT ON TABLE gdpr_audit_log IS 'Comprehensive audit trail for all GDPR-related actions and operations';

COMMENT ON COLUMN profiles.gdpr_consent_version IS 'Version of privacy policy/terms user consented to';
COMMENT ON COLUMN profiles.is_eu_user IS 'Identifies EU users for targeted GDPR compliance features';
COMMENT ON COLUMN profiles.privacy_settings IS 'User privacy preferences and consent settings (JSONB)';
COMMENT ON COLUMN profiles.data_retention_date IS 'Date when user data should be automatically purged';

-- Migration completed successfully
-- Next steps: Test RLS policies, validate indexes, verify data integrity