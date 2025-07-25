# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-24-gdpr-compliance-features/spec.md

> Created: 2025-07-24
> Version: 1.0.0

## Schema Changes

### New Tables

#### gdpr_consent_records
```sql
CREATE TABLE gdpr_consent_records (
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

CREATE INDEX idx_gdpr_consent_user_id ON gdpr_consent_records(user_id);
CREATE INDEX idx_gdpr_consent_type ON gdpr_consent_records(consent_type);
CREATE INDEX idx_gdpr_consent_created_at ON gdpr_consent_records(created_at);
```

#### gdpr_data_requests
```sql
CREATE TABLE gdpr_data_requests (
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

CREATE INDEX idx_gdpr_requests_user_id ON gdpr_data_requests(user_id);
CREATE INDEX idx_gdpr_requests_status ON gdpr_data_requests(status);
CREATE INDEX idx_gdpr_requests_type ON gdpr_data_requests(request_type);
```

#### data_processing_records
```sql
CREATE TABLE data_processing_records (
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

CREATE INDEX idx_data_processing_category ON data_processing_records(data_category);
CREATE INDEX idx_data_processing_active ON data_processing_records(is_active);
```

### New Columns for Existing Tables

#### profiles table additions
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent_version VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_eu_user BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_retention_date TIMESTAMP WITH TIME ZONE;
```

#### Enhanced audit logging
```sql
CREATE TABLE gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'consent_given', 'data_exported', 'account_deleted'
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  admin_user_id UUID REFERENCES profiles(id), -- If performed by admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gdpr_audit_user_id ON gdpr_audit_log(user_id);
CREATE INDEX idx_gdpr_audit_action ON gdpr_audit_log(action);
CREATE INDEX idx_gdpr_audit_created_at ON gdpr_audit_log(created_at);
```

## Row Level Security Policies

### gdpr_consent_records
```sql
-- Users can view their own consent records
CREATE POLICY "Users can view own consent records" ON gdpr_consent_records
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all consent records
CREATE POLICY "Admins can view all consent records" ON gdpr_consent_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- System can insert consent records
CREATE POLICY "System can insert consent records" ON gdpr_consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### gdpr_data_requests
```sql
-- Users can view and create their own requests
CREATE POLICY "Users can manage own GDPR requests" ON gdpr_data_requests
  FOR ALL USING (auth.uid() = user_id);

-- Admins can view and process all requests
CREATE POLICY "Admins can manage all GDPR requests" ON gdpr_data_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

## Migration Strategy

### Migration Order
1. Create new tables with proper indexes
2. Add columns to existing tables with safe defaults
3. Populate initial data processing records
4. Apply RLS policies
5. Create database functions for common operations

### Data Migration
```sql
-- Populate initial data processing records
INSERT INTO data_processing_records (data_category, processing_purpose, legal_basis, retention_period) VALUES
  ('profile_data', 'User account management and authentication', 'contract', '2_years_after_deletion'),
  ('health_metrics', 'Personalized coaching recommendations', 'consent', '2_years_after_deletion'),
  ('chat_history', 'AI coaching conversation context', 'consent', '2_years_after_deletion'),
  ('payment_data', 'Subscription billing and management', 'contract', '7_years');
```

## Rationale for Schema Design

- **Comprehensive Consent Tracking**: Captures all required elements for GDPR consent proof including exact text, version, and context
- **Flexible Request Processing**: JSONB fields allow for different request types with varying parameters
- **Audit Trail Completeness**: Every GDPR-related action is logged with sufficient detail for regulatory compliance
- **Performance Optimization**: Strategic indexes on commonly queried fields (user_id, timestamps, status)
- **Data Integrity**: Foreign key constraints ensure referential integrity while CASCADE deletes maintain consistency
- **Privacy by Design**: RLS policies ensure users can only access their own data while allowing necessary admin oversight