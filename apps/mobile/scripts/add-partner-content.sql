-- Script to add partner-provided content with full tracking
-- Usage: Edit the values below and run with psql

-- Step 1: Create or verify partner agreement
DO $$
DECLARE
    v_agreement_id UUID;
    v_source_id UUID;
BEGIN
    -- Check if partner agreement exists
    SELECT id INTO v_agreement_id
    FROM partner_agreements
    WHERE partner_name = 'Dr. Example Partner'
    AND contact_email = 'dr.partner@example.com';

    -- Create agreement if it doesn't exist
    IF v_agreement_id IS NULL THEN
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
            allowed_coaches,
            notes
        ) VALUES (
            'Dr. Example Partner',
            'doctor',
            'Example Medical Practice',
            'dr.partner@example.com',
            'content_license',
            'active',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '1 year',
            jsonb_build_object(
                'content_types', ARRAY['research', 'protocols', 'case_studies'],
                'attribution_required', true,
                'attribution_text', 'Content provided by Dr. Example Partner, MD',
                'update_frequency', 'monthly',
                'quality_review', true
            ),
            'free', -- or 'revenue_share', 'flat_fee', etc.
            ARRAY['carnivore'], -- coaches they can contribute to
            'Initial partnership for carnivore diet protocols'
        ) RETURNING id INTO v_agreement_id;
        
        RAISE NOTICE 'Created new partner agreement: %', v_agreement_id;
    ELSE
        RAISE NOTICE 'Using existing partner agreement: %', v_agreement_id;
    END IF;

    -- Step 2: Add the document source with full tracking
    INSERT INTO document_sources (
        coach_id,
        title,
        source_type,
        source_url,
        supplied_by,
        supplier_type,
        supplier_email,
        supplier_organization,
        agreement_id,
        acquisition_date,
        acquisition_method,
        license_type,
        copyright_holder,
        attribution_required,
        usage_permissions,
        metadata,
        store_original,
        storage_method
    ) VALUES (
        'carnivore',
        'Advanced Carnivore Diet Protocol for Autoimmune Conditions',
        'pdf',
        NULL, -- or URL if applicable
        'Dr. Example Partner',
        'partner_doctor',
        'dr.partner@example.com',
        'Example Medical Practice',
        v_agreement_id,
        CURRENT_DATE,
        'email_submission',
        'licensed',
        'Dr. Example Partner',
        true,
        jsonb_build_object(
            'can_modify', false,
            'can_redistribute', false,
            'requires_attribution', true,
            'exclusive_to_coachmeld', true,
            'expiration_date', (CURRENT_DATE + INTERVAL '1 year')::date,
            'usage_restrictions', ARRAY[
                'For CoachMeld users only',
                'Not for redistribution',
                'Must maintain attribution'
            ]
        ),
        jsonb_build_object(
            'version', '1.0',
            'pages', 25,
            'target_audience', 'Advanced practitioners',
            'conditions_addressed', ARRAY['Rheumatoid Arthritis', 'Hashimotos', 'Psoriasis'],
            'peer_reviewed', true,
            'last_updated', '2024-01-15'
        ),
        true, -- store original
        'file' -- or 'text' for smaller documents
    ) RETURNING id INTO v_source_id;

    -- Step 3: Add contributors if multiple people involved
    INSERT INTO source_contributions (
        source_id,
        contributor_name,
        contributor_role,
        contribution_type,
        contribution_date,
        notes
    ) VALUES 
    (
        v_source_id,
        'Dr. Example Partner',
        'Lead Author, MD',
        'author',
        CURRENT_DATE,
        'Primary researcher and protocol developer'
    ),
    (
        v_source_id,
        'Jane Smith, RD',
        'Registered Dietitian',
        'reviewer',
        CURRENT_DATE,
        'Nutritional analysis and meal plan review'
    );

    -- Step 4: Add audit trail entry
    INSERT INTO content_audit_trail (
        source_id,
        action,
        action_by_name,
        details
    ) VALUES (
        v_source_id,
        'uploaded',
        'Admin User', -- or your name
        jsonb_build_object(
            'upload_method', 'Manual SQL script',
            'partner_agreement', v_agreement_id,
            'verification_status', 'pending_review',
            'notes', 'Initial upload of partner content'
        )
    );

    -- Step 5: Add the actual content chunks
    -- This is where you'd add the document text, broken into chunks
    INSERT INTO coach_documents (
        coach_id,
        source_id,
        title,
        content,
        chunk_index,
        total_chunks,
        metadata
    ) VALUES 
    (
        'carnivore',
        v_source_id,
        'Introduction: Carnivore Diet for Autoimmune Conditions',
        'The carnivore diet has shown remarkable results in managing autoimmune conditions...',
        0,
        3, -- adjust based on actual chunks
        jsonb_build_object(
            'section', 'introduction',
            'keywords', ARRAY['autoimmune', 'inflammation', 'carnivore diet']
        )
    ),
    (
        'carnivore',
        v_source_id,
        'Protocol: Implementation Guidelines',
        'Week 1-2: Transition Phase. Begin by eliminating all plant foods...',
        1,
        3,
        jsonb_build_object(
            'section', 'protocol',
            'phase', 'implementation'
        )
    ),
    (
        'carnivore',
        v_source_id,
        'Case Studies and Results',
        'Patient A: 45-year-old female with RA. Results after 90 days...',
        2,
        3,
        jsonb_build_object(
            'section', 'case_studies',
            'evidence_type', 'clinical_observation'
        )
    );

    RAISE NOTICE 'Successfully added partner content with ID: %', v_source_id;
    
    -- Output summary
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Partner: Dr. Example Partner';
    RAISE NOTICE '- Agreement ID: %', v_agreement_id;
    RAISE NOTICE '- Source ID: %', v_source_id;
    RAISE NOTICE '- Chunks added: 3';
    
END $$;

-- Verify the upload
SELECT 
    ds.title,
    ds.supplied_by,
    ds.supplier_organization,
    pa.agreement_status,
    COUNT(cd.id) as chunk_count
FROM document_sources ds
JOIN partner_agreements pa ON ds.agreement_id = pa.id
LEFT JOIN coach_documents cd ON cd.source_id = ds.id
WHERE ds.supplied_by = 'Dr. Example Partner'
GROUP BY ds.id, ds.title, ds.supplied_by, ds.supplier_organization, pa.agreement_status
ORDER BY ds.created_at DESC;