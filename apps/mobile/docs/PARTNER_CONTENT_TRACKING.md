# Partner Content Tracking Guide

## Overview

CoachMeld tracks the complete provenance of all content sources, especially for partner-provided content from doctors, coaches, and companies.

## Key Tracking Features

### 1. **Source Attribution**
Every document tracks:
- **Supplied By**: Name of person/entity who provided it
- **Supplier Type**: Doctor, coach, company, institution, etc.
- **Supplier Email**: Contact information
- **Organization**: Company/practice name
- **Acquisition Date**: When we received it
- **Acquisition Method**: How we got it (email, API, portal, etc.)

### 2. **Partnership Agreements**
Formal tracking of:
- Agreement terms and status
- Compensation models
- Usage permissions
- Content categories allowed
- Expiration dates

### 3. **Audit Trail**
Complete history of:
- Who uploaded/modified content
- When changes were made
- What actions were taken
- IP addresses for compliance

## Usage Examples

### Adding Partner Content

```sql
-- Example: Dr. Baker provides carnivore research
SELECT track_content_source(
    'Carnivore Diet Clinical Outcomes 2024',  -- title
    'carnivore',                              -- coach_id
    'Dr. Shawn Baker',                        -- supplied_by
    'partner_doctor',                         -- supplier_type
    'dr.baker@meatrx.com',                   -- supplier_email
    'agreement-id-here',                      -- agreement_id (optional)
    jsonb_build_object(
        'content_category', 'clinical_research',
        'exclusivity', 'non-exclusive',
        'can_modify', false
    )
);
```

### Creating Partner Agreement

```sql
-- Set up partnership with a doctor
INSERT INTO partner_agreements (
    partner_name,
    partner_type,
    organization,
    contact_email,
    agreement_type,
    agreement_status,
    start_date,
    end_date,
    terms,
    compensation_model,
    allowed_coaches
) VALUES (
    'Dr. Sarah Johnson',
    'doctor',
    'Johnson Wellness Clinic',
    'dr.johnson@wellnessclinic.com',
    'content_license',
    'active',
    '2024-01-01',
    '2025-01-01',
    jsonb_build_object(
        'content_types', ARRAY['protocols', 'meal_plans', 'case_studies'],
        'max_documents', 50,
        'attribution_text', 'Content provided by Dr. Sarah Johnson, MD',
        'update_frequency', 'quarterly'
    ),
    'revenue_share',
    ARRAY['carnivore', 'keto']
);
```

### Tracking Multiple Contributors

```sql
-- Document with multiple contributors
WITH source AS (
    INSERT INTO document_sources (
        coach_id, title, supplied_by, supplier_type
    ) VALUES (
        'carnivore',
        'Comprehensive Carnivore Guide 2024',
        'Dr. Paul Saladino',
        'partner_doctor'
    ) RETURNING id
)
INSERT INTO source_contributions (source_id, contributor_name, contributor_role, contribution_type)
VALUES 
    ((SELECT id FROM source), 'Dr. Paul Saladino', 'Lead Author', 'author'),
    ((SELECT id FROM source), 'Dr. Shawn Baker', 'Contributing Author', 'co-author'),
    ((SELECT id FROM source), 'Judy Cho', 'Nutritionist', 'reviewer');
```

### Viewing Content Provenance

```sql
-- Get full history of a document
SELECT * FROM get_source_provenance('source-id-here');

-- Find all content from a specific partner
SELECT 
    ds.title,
    ds.acquisition_date,
    ds.metadata->>'content_category' as category,
    pa.agreement_status
FROM document_sources ds
LEFT JOIN partner_agreements pa ON ds.agreement_id = pa.id
WHERE ds.supplied_by = 'Dr. Shawn Baker'
ORDER BY ds.acquisition_date DESC;

-- Check agreement status for all partners
SELECT 
    partner_name,
    partner_type,
    organization,
    agreement_status,
    end_date,
    CASE 
        WHEN end_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN end_date < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING SOON'
        ELSE 'ACTIVE'
    END as status_alert
FROM partner_agreements
WHERE agreement_status = 'active'
ORDER BY end_date;
```

## Partner Types

### 1. **Partner Doctor** (`partner_doctor`)
- Licensed medical professionals
- Provides: Research, protocols, case studies
- Example: "Dr. Ken Berry, MD"

### 2. **Partner Coach** (`partner_coach`)
- Certified coaches/trainers
- Provides: Programs, guides, tips
- Example: "John Smith, CSCS"

### 3. **Partner Company** (`partner_company`)
- Businesses providing content
- Provides: Products info, sponsored content
- Example: "Butcher Box"

### 4. **Research Institution** (`research_institution`)
- Universities, labs
- Provides: Studies, data
- Example: "Harvard Medical School"

### 5. **Content Creator** (`content_creator`)
- YouTubers, bloggers
- Provides: Transcripts, articles
- Example: "Thomas DeLauer"

## Usage Permissions Tracking

Each source can have specific permissions:

```json
{
    "can_modify": false,           // Can we edit the content?
    "can_redistribute": false,     // Can we share with other platforms?
    "requires_attribution": true,  // Must we credit the source?
    "exclusive_to_coachmeld": true, // Is this exclusive content?
    "expiration_date": "2025-12-31", // When do rights expire?
    "usage_restrictions": [
        "No use in marketing materials",
        "Academic use only"
    ]
}
```

## Audit Trail

Every action is logged:

```sql
-- View all actions on partner content
SELECT 
    cat.action,
    cat.action_date,
    cat.action_by_name,
    cat.details,
    ds.title
FROM content_audit_trail cat
JOIN document_sources ds ON cat.source_id = ds.id
WHERE ds.supplier_type LIKE 'partner_%'
ORDER BY cat.action_date DESC
LIMIT 50;
```

## Best Practices

### 1. **Always Track Sources**
```sql
-- Bad: No attribution
INSERT INTO document_sources (coach_id, title)
VALUES ('carnivore', 'Some document');

-- Good: Full attribution
SELECT track_content_source(
    'Carnivore Research 2024',
    'carnivore',
    'Dr. Smith',
    'partner_doctor',
    'dr.smith@clinic.com'
);
```

### 2. **Document Agreements**
- Upload signed agreements to storage
- Set calendar reminders for renewals
- Track compensation accurately

### 3. **Regular Audits**
```sql
-- Monthly audit query
SELECT 
    supplier_type,
    COUNT(*) as document_count,
    COUNT(DISTINCT supplied_by) as unique_suppliers,
    COUNT(DISTINCT agreement_id) as agreements
FROM document_sources
WHERE acquisition_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY supplier_type;
```

## Compliance Reports

### Content by Partner
```sql
-- Generate partner content report
SELECT 
    pa.partner_name,
    pa.organization,
    COUNT(ds.id) as total_documents,
    MAX(ds.acquisition_date) as last_submission,
    pa.compensation_model,
    pa.end_date
FROM partner_agreements pa
LEFT JOIN document_sources ds ON ds.agreement_id = pa.id
WHERE pa.agreement_status = 'active'
GROUP BY pa.id, pa.partner_name, pa.organization, pa.compensation_model, pa.end_date
ORDER BY total_documents DESC;
```

### Expiring Agreements
```sql
-- Agreements expiring in next 60 days
SELECT 
    partner_name,
    contact_email,
    end_date,
    end_date - CURRENT_DATE as days_remaining
FROM partner_agreements
WHERE agreement_status = 'active'
AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
ORDER BY end_date;
```

## Future Enhancements

- [ ] Automated agreement renewal reminders
- [ ] Partner portal for direct uploads
- [ ] Revenue sharing calculations
- [ ] Content performance analytics per partner
- [ ] Automated attribution in coach responses