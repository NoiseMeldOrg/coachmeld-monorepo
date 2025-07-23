# GDPR Compliance Requirements for CoachMeld

**Document Version:** 1.0.0  
**Last Updated:** June 27, 2025  
**Target Implementation:** v0.8.0 (July 2025)  
**Compliance Officer:** TBD

## Overview

This document outlines the General Data Protection Regulation (GDPR) compliance requirements for CoachMeld. As we process personal health data of EU citizens (and apply GDPR globally for simplicity), we must ensure full compliance before our v1.0.0 market launch.

## Key GDPR Principles

### 1. Lawfulness, Fairness, and Transparency
- **Requirement**: Clear legal basis for data processing
- **Implementation**: 
  - Explicit consent for health data processing
  - Transparent privacy policy
  - Clear data usage explanations

### 2. Purpose Limitation
- **Requirement**: Data collected for specified, explicit purposes
- **Implementation**:
  - Define specific purposes for each data type
  - Prevent scope creep in data usage
  - Regular audits of data practices

### 3. Data Minimization
- **Requirement**: Only collect necessary data
- **Implementation**:
  - Review all data fields for necessity
  - Optional vs required fields
  - Progressive data collection

### 4. Accuracy
- **Requirement**: Keep personal data accurate and up to date
- **Implementation**:
  - User profile editing capabilities
  - Data validation on input
  - Regular prompts to update information

### 5. Storage Limitation
- **Requirement**: Not kept longer than necessary
- **Implementation**:
  - Data retention policy (2 years active, 1 year inactive)
  - Automatic deletion schedules
  - Anonymization for analytics

### 6. Integrity and Confidentiality
- **Requirement**: Appropriate security measures
- **Implementation**:
  - Encryption at rest and in transit
  - Access controls and authentication
  - Regular security audits

### 7. Accountability
- **Requirement**: Demonstrate compliance
- **Implementation**:
  - Documentation of all processes
  - Audit trails
  - Privacy impact assessments

## User Rights Implementation

### 1. Right to Access (Article 15)
**Features Required**:
- Data export functionality in settings
- Include all personal data in machine-readable format (JSON)
- 30-day response time SLA

**Implementation**:
```typescript
// Data export should include:
- Profile information
- Health metrics history
- Chat conversations
- Subscription history
- Consent records
- Login history
```

### 2. Right to Rectification (Article 16)
**Features Required**:
- Edit profile functionality (already exists)
- Ability to correct any personal data
- Audit trail of changes

### 3. Right to Erasure / "Right to be Forgotten" (Article 17)
**Features Required**:
- Delete account option in settings
- Complete data removal process
- Retention only where legally required

**Implementation Steps**:
1. Soft delete (30-day grace period)
2. Hard delete after grace period
3. Remove from all backups within 90 days
4. Maintain deletion log for compliance

### 4. Right to Data Portability (Article 20)
**Features Required**:
- Export data in common format (JSON/CSV)
- Direct transfer to other services (future)
- Clear documentation of data structure

### 5. Right to Object (Article 21)
**Features Required**:
- Opt-out of marketing communications
- Object to specific processing activities
- Granular consent management

### 6. Rights Related to Automated Decision Making (Article 22)
**Features Required**:
- Explanation of AI coaching logic
- Human review option for AI decisions
- Opt-out of certain AI features

## Consent Management

### Initial Consent Flow
1. **Signup Screen**:
   - Checkbox: "I agree to the Terms of Service"
   - Checkbox: "I agree to the Privacy Policy"
   - Checkbox: "I consent to processing of my health data for personalized coaching"

2. **Additional Consents**:
   - Marketing communications (optional)
   - Analytics and improvement (optional)
   - Third-party integrations (future, optional)

### Consent Records
Store for each consent:
- User ID
- Consent type
- Version of terms/policy
- Timestamp
- IP address
- Withdrawal date (if applicable)

## Privacy by Design Implementation

### 1. Data Collection
- **Minimize**: Only collect what's needed
- **Progressive**: Don't ask for everything upfront
- **Optional Fields**: Clearly marked
- **Sensitive Data**: Extra consent and security

### 2. Data Processing
- **Purpose Binding**: Use data only for stated purposes
- **Access Controls**: Role-based permissions
- **Audit Logs**: Track all data access
- **Encryption**: End-to-end where possible

### 3. Data Storage
- **Encryption**: AES-256 at rest
- **Segmentation**: Separate PII from other data
- **Backups**: Encrypted and access-controlled
- **Geographic**: Data residency options (future)

### 4. Data Sharing
- **No Third-Party Sharing**: Without explicit consent
- **Processor Agreements**: For services like Stripe
- **Anonymization**: For analytics
- **Transparency**: Clear about all sharing

## Technical Requirements

### Database Schema Updates
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN gdpr_consent_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN data_processing_consent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN analytics_consent BOOLEAN DEFAULT true;

-- Consent history table
CREATE TABLE consent_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    action VARCHAR(20) CHECK (action IN ('granted', 'withdrawn')),
    version VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data export requests
CREATE TABLE data_export_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    export_url TEXT,
    expires_at TIMESTAMPTZ
);

-- Deletion requests
CREATE TABLE deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    completed_at TIMESTAMPTZ,
    reason TEXT
);
```

### API Endpoints Required
```typescript
// Privacy endpoints
POST   /api/privacy/export-request
GET    /api/privacy/export/:requestId
POST   /api/privacy/delete-account
POST   /api/privacy/withdraw-consent
GET    /api/privacy/consent-status
PUT    /api/privacy/update-consents
```

### UI Components Required

#### 1. Privacy Consent Modal
```typescript
interface PrivacyConsentModalProps {
  onAccept: (consents: ConsentOptions) => void;
  onDecline: () => void;
}

interface ConsentOptions {
  dataProcessing: boolean;  // Required
  marketing: boolean;       // Optional
  analytics: boolean;       // Optional
}
```

#### 2. Privacy Settings Screen
- View all consents
- Withdraw specific consents
- Request data export
- Delete account option
- Contact privacy officer

#### 3. Cookie Banner (Web)
- Essential cookies notice
- Optional analytics cookies
- Preference management
- Remember choices

## Compliance Documentation

### Required Documents
1. **Privacy Policy** (Update existing)
   - How we collect data
   - What we collect
   - Why we collect it
   - How we protect it
   - User rights
   - Contact information

2. **Cookie Policy** (New)
   - Types of cookies used
   - Purpose of each cookie
   - How to manage cookies
   - Third-party cookies

3. **Data Processing Agreement** (DPA)
   - For B2B customers
   - Standard contractual clauses
   - Security measures
   - Sub-processor list

4. **Privacy Impact Assessment** (PIA)
   - Risk assessment
   - Mitigation measures
   - Regular reviews
   - Approval process

### Record Keeping
1. **Processing Activities Record**:
   - Categories of data subjects
   - Categories of personal data
   - Processing purposes
   - Data retention periods
   - Security measures

2. **Consent Records**:
   - Who consented
   - When they consented
   - What they consented to
   - How consent was obtained
   - Withdrawal records

3. **Breach Register**:
   - Date and time
   - Nature of breach
   - Data affected
   - Impact assessment
   - Remedial actions

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Update database schema
- [ ] Create privacy API endpoints
- [ ] Implement consent management system
- [ ] Add audit logging

### Phase 2: User Rights (Week 2)
- [ ] Build data export functionality
- [ ] Implement account deletion flow
- [ ] Create privacy settings screen
- [ ] Add consent withdrawal options

### Phase 3: UI/UX (Week 3)
- [ ] Design privacy consent modal
- [ ] Create cookie banner for web
- [ ] Update signup flow
- [ ] Add privacy notices throughout app

### Phase 4: Documentation (Week 4)
- [ ] Update Privacy Policy
- [ ] Write Cookie Policy
- [ ] Create DPA template
- [ ] Complete Privacy Impact Assessment

### Phase 5: Testing & Validation
- [ ] Test all privacy features
- [ ] Validate data export completeness
- [ ] Verify deletion processes
- [ ] Audit consent flows

## Ongoing Compliance

### Regular Reviews
- **Quarterly**: Privacy policy review
- **Bi-annual**: Privacy Impact Assessment
- **Annual**: Full GDPR audit
- **As needed**: Update for new features

### Training Requirements
- All team members: GDPR basics
- Developers: Privacy by design
- Support team: Handling privacy requests
- Management: Compliance responsibilities

### Metrics to Track
- Consent rates
- Privacy request volume
- Response times
- Compliance incidents
- User complaints

## Emergency Procedures

### Data Breach Response
1. **Detect**: Identify and contain
2. **Assess**: Determine scope and impact
3. **Notify**: Authorities within 72 hours if required
4. **Communicate**: Affected users if high risk
5. **Document**: Full incident report
6. **Review**: Lessons learned and improvements

### Contact Information
- **Data Protection Officer**: [TBD]
- **Privacy Email**: privacy@coachmeld.app
- **Emergency Contact**: [TBD]

## Conclusion

GDPR compliance is not just a legal requirement but an opportunity to build trust with our users. By implementing these requirements in v0.8.0, we ensure that CoachMeld respects user privacy and maintains the highest standards of data protection.

Full compliance must be achieved before the v1.0.0 market launch in September 2025.