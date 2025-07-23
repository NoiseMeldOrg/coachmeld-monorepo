# Legal Considerations for CoachMeld

## Document Source Legality

### Copyright Considerations

#### ✅ Safe to Use:
1. **Public Domain Content**
   - Government publications (FDA, NIH, CDC)
   - Works with expired copyright
   - Creative Commons licensed content (check specific license)

2. **Content with Permission**
   - Licensed research papers
   - Partner content with agreements
   - User-submitted personal documents

3. **Fair Use (Limited)**
   - Small excerpts for educational purposes
   - Transformative use (significantly modified)
   - Non-commercial research

#### ❌ Avoid Using:
1. **Copyrighted Books/Textbooks** without permission
2. **Paywalled Research Papers** without license
3. **Proprietary Diet Programs** (e.g., commercial diet plans)
4. **Medical Textbooks** without proper licensing
5. **Blog Posts/Articles** without permission

### Content Metadata Requirements

```sql
-- Track source legality in metadata
INSERT INTO document_sources (
    coach_id,
    title,
    source_type,
    metadata
) VALUES (
    'carnivore',
    'NIH Dietary Guidelines',
    'pdf',
    jsonb_build_object(
        'source_url', 'https://www.nih.gov/...',
        'license', 'public_domain',
        'attribution', 'National Institutes of Health',
        'permission_status', 'not_required',
        'date_accessed', '2024-01-15',
        'copyright_holder', 'US Government'
    )
);
```

## Medical & Health Disclaimers

### Required Disclaimers by Feature

#### 1. **General Health Disclaimer** (App-wide)
- Not a substitute for professional medical advice
- Consult healthcare provider before dietary changes
- Emergency medical situations warning

#### 2. **Dietary Advice Disclaimer** (Coach-specific)
- Individual results may vary
- Potential risks of restrictive diets
- Special populations warnings (pregnant, diabetic, etc.)

#### 3. **AI-Generated Content Warning**
- Responses are AI-generated
- May contain errors or outdated information
- Always verify with professionals

### Implementation Locations

1. **First App Launch** - Full disclaimer acceptance
2. **Coach Selection** - Coach-specific warnings
3. **Chat Interface** - Persistent reminder
4. **Profile Creation** - Health conditions acknowledgment

## Data Privacy & User Content

### User-Generated Content
- Users own their chat history
- Right to export/delete data
- Clear data retention policy

### Health Information (HIPAA Considerations)
- Not a covered entity under HIPAA
- Still follow best practices:
  - Encryption at rest and in transit
  - Access controls
  - Audit logs
  - Data minimization

## International Compliance

### GDPR (European Users)
- Right to be forgotten
- Data portability
- Explicit consent for data processing
- Privacy policy requirements

### Regional Health Regulations
- Some countries restrict health advice apps
- Age restrictions may apply
- Consider geo-blocking if necessary

## Recommended Legal Documents

1. **Terms of Service**
2. **Privacy Policy**
3. **Medical Disclaimer**
4. **Content License Agreement**
5. **Data Processing Agreement**

## Source Attribution Template

```typescript
interface DocumentSource {
    // ... other fields
    attribution: {
        copyright_holder: string;
        license_type: 'public_domain' | 'cc_by' | 'cc_by_sa' | 'proprietary' | 'fair_use';
        permission_date?: string;
        permission_contact?: string;
        source_url?: string;
        restrictions?: string[];
    };
}
```

## Risk Mitigation Strategies

### 1. Content Filtering
- Implement source whitelist
- Require admin approval for new sources
- Regular audit of document sources

### 2. Clear Labeling
```typescript
// Label content by reliability
enum ContentReliability {
    PEER_REVIEWED = 'peer_reviewed',
    GOVERNMENT_SOURCE = 'government_source',
    LICENSED_PROFESSIONAL = 'licensed_professional',
    COMMUNITY_CONTRIBUTED = 'community_contributed',
    AI_GENERATED = 'ai_generated'
}
```

### 3. Automated Compliance Checks
- Copyright detection system
- Source verification
- License compatibility checker

## Liability Insurance Considerations

Consider obtaining:
- **Professional Liability Insurance** (E&O)
- **General Liability Insurance**
- **Cyber Liability Insurance**

## Regular Legal Review

Schedule quarterly reviews of:
- New document sources
- Updated regulations
- User complaints
- Disclaimer effectiveness

## Emergency Response Plan

If legal issue arises:
1. Immediately remove questionable content
2. Document the issue
3. Consult legal counsel
4. Notify affected users if required
5. Implement preventive measures

## Coach-Specific Considerations

### Carnivore Coach
- Higher risk due to restrictive nature
- Extra warnings for medical conditions
- Clear "not for everyone" messaging

### Discipleship Coach
- Respect religious diversity
- Avoid medical claims about prayer/faith
- Clear spiritual vs. medical distinction

### Future Health Coaches
- Each coach needs risk assessment
- Specialized disclaimers per domain
- Regular review of coach content