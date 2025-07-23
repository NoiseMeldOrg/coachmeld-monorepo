-- Create GDPR requests table for managing all GDPR-related requests
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify', 'portability')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  requested_by VARCHAR(255), -- Email or identifier of the requester
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  file_url TEXT, -- For export downloads
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX idx_gdpr_requests_requested_at ON gdpr_requests(requested_at);

-- Create GDPR deletion details table for tracking deletion-specific information
CREATE TABLE IF NOT EXISTS gdpr_deletion_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES gdpr_requests(id) ON DELETE CASCADE,
  soft_delete BOOLEAN DEFAULT true,
  deletion_reason TEXT,
  included_data TEXT[], -- Array of data types to delete
  excluded_data TEXT[], -- Array of data types to preserve
  grace_period_ends TIMESTAMP WITH TIME ZONE,
  deletion_executed_at TIMESTAMP WITH TIME ZONE,
  deletion_certificate JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for deletion details
CREATE INDEX idx_gdpr_deletion_details_request_id ON gdpr_deletion_details(request_id);

-- Create consent records table for tracking user consents
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_version VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for consent records
CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_created_at ON consent_records(created_at);

-- Create unique index to track latest consent per type per user
CREATE UNIQUE INDEX idx_consent_records_user_type_latest 
ON consent_records(user_id, consent_type, created_at DESC);

-- Create audit log table for GDPR operations
CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  gdpr_relevant BOOLEAN DEFAULT true
);

-- Create indexes for audit log
CREATE INDEX idx_gdpr_audit_log_admin_id ON gdpr_audit_log(admin_id);
CREATE INDEX idx_gdpr_audit_log_timestamp ON gdpr_audit_log(timestamp);
CREATE INDEX idx_gdpr_audit_log_resource ON gdpr_audit_log(resource_type, resource_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_gdpr_requests_updated_at
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_deletion_details_updated_at
  BEFORE UPDATE ON gdpr_deletion_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate SLA deadline (30 days from request)
CREATE OR REPLACE FUNCTION calculate_gdpr_deadline(requested_at TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN requested_at + INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for GDPR request overview with SLA tracking
CREATE OR REPLACE VIEW gdpr_requests_overview AS
SELECT 
  r.*,
  calculate_gdpr_deadline(r.requested_at) as sla_deadline,
  CASE 
    WHEN r.status IN ('completed', 'cancelled') THEN NULL
    WHEN NOW() > calculate_gdpr_deadline(r.requested_at) THEN 'overdue'
    WHEN NOW() > calculate_gdpr_deadline(r.requested_at) - INTERVAL '3 days' THEN 'warning'
    ELSE 'on_track'
  END as sla_status,
  dd.soft_delete,
  dd.deletion_reason,
  dd.grace_period_ends,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_full_name,
  admin.email as processed_by_email
FROM gdpr_requests r
LEFT JOIN gdpr_deletion_details dd ON r.id = dd.request_id
LEFT JOIN auth.users u ON r.user_id = u.id
LEFT JOIN auth.users admin ON r.processed_by = admin.id;

-- Grant appropriate permissions (adjust based on your roles)
GRANT ALL ON gdpr_requests TO authenticated;
GRANT ALL ON gdpr_deletion_details TO authenticated;
GRANT ALL ON consent_records TO authenticated;
GRANT ALL ON gdpr_audit_log TO authenticated;
GRANT SELECT ON gdpr_requests_overview TO authenticated;

-- Enable Row Level Security
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_deletion_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only access for now)
CREATE POLICY "Admin users can view all GDPR requests" ON gdpr_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin users can manage deletion details" ON gdpr_deletion_details
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin users can view consent records" ON consent_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin users can view audit logs" ON gdpr_audit_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to get GDPR request statistics
CREATE OR REPLACE FUNCTION get_gdpr_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*)::int,
    'pending', COUNT(*) FILTER (WHERE status = 'pending')::int,
    'processing', COUNT(*) FILTER (WHERE status = 'processing')::int,
    'completed', COUNT(*) FILTER (WHERE status = 'completed')::int,
    'failed', COUNT(*) FILTER (WHERE status = 'failed')::int,
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')::int,
    'overdue', COUNT(*) FILTER (WHERE sla_status = 'overdue')::int,
    'dueSoon', COUNT(*) FILTER (WHERE sla_status = 'warning')::int
  ) INTO result
  FROM gdpr_requests_overview;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;