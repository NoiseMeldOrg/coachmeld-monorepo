/**
 * GDPR Data Processing Records Management API
 * Manages the data_processing_records table for GDPR Article 30 compliance
 * Tracks all data processing activities and their legal basis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')
    const lawfulBasis = searchParams.get('lawful_basis')

    // Build query
    let query = supabase
      .from('data_processing_records')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (lawfulBasis) {
      query = query.eq('lawful_basis', lawfulBasis)
    }

    const { data: processingRecords, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching processing records:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({
      processing_records: processingRecords || [],
      total: processingRecords?.length || 0
    })
  } catch (error: any) {
    console.error('Unexpected error in processing records GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const requiredFields = ['purpose', 'lawful_basis', 'data_categories', 'retention_period']
    const missingFields = requiredFields.filter(field => !payload[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 })
    }

    // Validate lawful_basis enum
    const validLawfulBases = [
      'consent', 'contract', 'legal_obligation', 
      'vital_interests', 'public_task', 'legitimate_interests'
    ]
    if (!validLawfulBases.includes(payload.lawful_basis)) {
      return NextResponse.json({ 
        error: `Invalid lawful_basis. Must be one of: ${validLawfulBases.join(', ')}` 
      }, { status: 400 })
    }

    // Create processing record
    const { data: processingRecord, error: insertError } = await supabase
      .from('data_processing_records')
      .insert({
        purpose: payload.purpose,
        lawful_basis: payload.lawful_basis,
        data_categories: payload.data_categories,
        recipients: payload.recipients || [],
        retention_period: payload.retention_period,
        cross_border_transfers: payload.cross_border_transfers || null,
        safeguards: payload.safeguards || null,
        is_active: payload.is_active !== false // Default to true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating processing record:', insertError)
      return NextResponse.json({ error: 'Failed to create processing record' }, { status: 500 })
    }

    // Log the action
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'create_processing_record',
        p_resource_type: 'data_processing_record',
        p_resource_id: processingRecord.id,
        p_changes: payload,
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging processing record creation:', auditError)
    }

    return NextResponse.json({
      success: true,
      processing_record: processingRecord,
      message: 'Data processing record created successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error in processing records POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    if (!payload.id) {
      return NextResponse.json({ error: 'Processing record ID is required' }, { status: 400 })
    }

    // Validate lawful_basis if provided
    if (payload.lawful_basis) {
      const validLawfulBases = [
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
      ]
      if (!validLawfulBases.includes(payload.lawful_basis)) {
        return NextResponse.json({ 
          error: `Invalid lawful_basis. Must be one of: ${validLawfulBases.join(', ')}` 
        }, { status: 400 })
      }
    }

    // Fetch existing record to compare changes
    const { data: existingRecord, error: fetchError } = await supabase
      .from('data_processing_records')
      .select('*')
      .eq('id', payload.id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Processing record not found' }, { status: 404 })
    }

    // Update processing record
    const updateData: any = {}
    const allowedFields = [
      'purpose', 'lawful_basis', 'data_categories', 'recipients', 
      'retention_period', 'cross_border_transfers', 'safeguards', 'is_active'
    ]

    allowedFields.forEach(field => {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field]
      }
    })

    const { data: updatedRecord, error: updateError } = await supabase
      .from('data_processing_records')
      .update(updateData)
      .eq('id', payload.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating processing record:', updateError)
      return NextResponse.json({ error: 'Failed to update processing record' }, { status: 500 })
    }

    // Log the action
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'update_processing_record',
        p_resource_type: 'data_processing_record',
        p_resource_id: payload.id,
        p_changes: {
          old_values: existingRecord,
          new_values: updateData
        },
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging processing record update:', auditError)
    }

    return NextResponse.json({
      success: true,
      processing_record: updatedRecord,
      message: 'Data processing record updated successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error in processing records PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const recordId = searchParams.get('id')

    if (!recordId) {
      return NextResponse.json({ error: 'Processing record ID is required' }, { status: 400 })
    }

    // Fetch existing record for audit trail
    const { data: existingRecord, error: fetchError } = await supabase
      .from('data_processing_records')
      .select('*')
      .eq('id', recordId)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Processing record not found' }, { status: 404 })
    }

    // Soft delete (deactivate) rather than hard delete for compliance
    const { data: deactivatedRecord, error: deactivateError } = await supabase
      .from('data_processing_records')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single()

    if (deactivateError) {
      console.error('Error deactivating processing record:', deactivateError)
      return NextResponse.json({ error: 'Failed to deactivate processing record' }, { status: 500 })
    }

    // Log the action
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'deactivate_processing_record',
        p_resource_type: 'data_processing_record',
        p_resource_id: recordId,
        p_changes: {
          deactivated_record: existingRecord,
          reason: 'Admin deletion request'
        },
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging processing record deactivation:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Data processing record deactivated successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error in processing records DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}