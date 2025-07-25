/**
 * GDPR Consent Management API
 * Handles recording and retrieving user consent for data processing
 * Using the new gdpr_consent_records schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    // Validate required fields
    if (!payload.consent_type || typeof payload.consent_given !== 'boolean' || !payload.legal_basis || !payload.consent_text || !payload.version) {
      return NextResponse.json({ 
        error: 'Missing required fields: consent_type, consent_given, legal_basis, consent_text, version' 
      }, { status: 400 })
    }

    // Validate consent_type enum
    const validConsentTypes = ['data_processing', 'marketing', 'analytics', 'cookies']
    if (!validConsentTypes.includes(payload.consent_type)) {
      return NextResponse.json({ 
        error: `Invalid consent_type. Must be one of: ${validConsentTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Validate legal_basis enum
    const validLegalBases = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests', 'withdrawal']
    if (!validLegalBases.includes(payload.legal_basis)) {
      return NextResponse.json({ 
        error: `Invalid legal_basis. Must be one of: ${validLegalBases.join(', ')}` 
      }, { status: 400 })
    }

    // Record consent
    const { data: consentRecord, error: consentError } = await supabase
      .from('gdpr_consent_records')
      .insert({
        user_id: user.id,
        consent_type: payload.consent_type,
        consent_given: payload.consent_given,
        legal_basis: payload.legal_basis,
        consent_text: payload.consent_text,
        version: payload.version,
        source: payload.source || 'admin_panel'
      })
      .select()
      .single()

    if (consentError) {
      console.error('Error recording consent:', consentError)
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
    }

    // Log the action using the log_gdpr_action function
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: payload.consent_given ? 'grant_consent' : 'withdraw_consent',
        p_resource_type: 'consent_record',
        p_resource_id: consentRecord.id,
        p_changes: {
          consent_type: payload.consent_type,
          consent_given: payload.consent_given,
          legal_basis: payload.legal_basis,
          version: payload.version
        },
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging consent audit trail:', auditError)
      // Don't fail the request for audit errors, just log
    }

    return NextResponse.json({
      success: true,
      consent_id: consentRecord.id,
      recorded_at: consentRecord.created_at
    })
  } catch (error: any) {
    console.error('Unexpected error in consent POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id') || user.id // Default to current user
    const consentType = searchParams.get('consent_type') // Optional filter

    // Build query
    let query = supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Filter by consent type if specified
    if (consentType) {
      query = query.eq('consent_type', consentType)
    }

    const { data: consentRecords, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching consent records:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Group by consent_type to get the latest consent for each type
    const latestConsents: { [key: string]: any } = {}
    consentRecords?.forEach(record => {
      if (!latestConsents[record.consent_type] || 
          new Date(record.created_at) > new Date(latestConsents[record.consent_type].created_at)) {
        latestConsents[record.consent_type] = record
      }
    })

    // Convert to array format expected by API spec
    const consents = Object.values(latestConsents).map(record => ({
      consent_type: record.consent_type,
      consent_given: record.consent_given,
      legal_basis: record.legal_basis,
      version: record.version,
      created_at: record.created_at,
      source: record.source
    }))

    return NextResponse.json({
      consents: consents
    })
  } catch (error: any) {
    console.error('Unexpected error in consent GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}