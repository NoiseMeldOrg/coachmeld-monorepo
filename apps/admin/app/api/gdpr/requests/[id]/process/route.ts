/**
 * GDPR Request Processing API
 * Admin endpoint for processing GDPR requests (approve, reject, complete)
 * Using the new gdpr_data_requests schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ProcessRequestPayload {
  action: 'approve' | 'reject' | 'complete'
  notes?: string
  export_data?: any
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin permission check here
    // For now, assume all authenticated users are admins

    const requestId = params.id
    const payload: ProcessRequestPayload = await request.json()

    // Validate required fields
    if (!payload.action || !['approve', 'reject', 'complete'].includes(payload.action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be one of: approve, reject, complete' 
      }, { status: 400 })
    }

    // Fetch the existing request
    const { data: existingRequest, error: fetchError } = await supabase
      .from('gdpr_data_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'GDPR request not found' }, { status: 404 })
    }

    // Prevent processing already completed requests
    if (existingRequest.status === 'completed' || existingRequest.status === 'cancelled') {
      return NextResponse.json({ 
        error: `Request already ${existingRequest.status}` 
      }, { status: 400 })
    }

    // Determine new status based on action
    let newStatus: string
    let completedAt: string | null = null
    let processedData: any = {}

    switch (payload.action) {
      case 'approve':
        newStatus = 'approved'
        break
      case 'reject':
        newStatus = 'rejected'
        completedAt = new Date().toISOString()
        break
      case 'complete':
        newStatus = 'completed'
        completedAt = new Date().toISOString()
        
        // For deletion requests, perform the actual deletion
        if (existingRequest.request_type === 'deletion') {
          const deletionResult = await performUserDataDeletion(supabase, existingRequest.user_id)
          processedData = {
            deletion_summary: deletionResult,
            deletion_completed_at: completedAt
          }
        }
        
        // For export requests, store the export data
        if (existingRequest.request_type === 'export' && payload.export_data) {
          processedData = {
            export_data: payload.export_data,
            export_completed_at: completedAt
          }
        }
        break
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('gdpr_data_requests')
      .update({
        status: newStatus,
        completed_at: completedAt,
        admin_notes: payload.notes || null,
        processed_data: processedData
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating GDPR request:', updateError)
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }

    // Log the admin action
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: `${payload.action}_request`,
        p_resource_type: 'gdpr_data_request',
        p_resource_id: requestId,
        p_changes: {
          old_status: existingRequest.status,
          new_status: newStatus,
          action: payload.action,
          notes: payload.notes,
          processed_data: processedData
        },
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging admin action:', auditError)
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      new_status: newStatus,
      processed_at: completedAt || new Date().toISOString(),
      processing_time_hours: completedAt 
        ? Math.round((new Date(completedAt).getTime() - new Date(existingRequest.created_at).getTime()) / (1000 * 60 * 60))
        : null
    })
  } catch (error: any) {
    console.error('Unexpected error in request processing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to perform user data deletion
async function performUserDataDeletion(supabase: any, userId: string) {
  const deletionSummary = {
    tables_affected: [] as string[],
    records_deleted: 0,
    files_removed: 0,
    errors: [] as string[]
  }

  // Define tables to delete from (in order to respect foreign key constraints)
  const tablesToDelete = [
    'messages',
    'user_health_metrics',
    'gdpr_consent_records',
    'gdpr_data_requests',
    'subscriptions',
    'profiles' // This should be last due to foreign key relationships
  ]

  for (const table of tablesToDelete) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)
        .select('id')

      if (error) {
        console.error(`Error deleting from ${table}:`, error)
        deletionSummary.errors.push(`Failed to delete from ${table}: ${error.message}`)
      } else {
        deletionSummary.tables_affected.push(table)
        deletionSummary.records_deleted += data?.length || 0
      }
    } catch (err) {
      console.error(`Unexpected error deleting from ${table}:`, err)
      deletionSummary.errors.push(`Unexpected error deleting from ${table}`)
    }
  }

  // TODO: Delete files from storage if needed
  // This would involve querying for user files and removing them from Supabase Storage

  return deletionSummary
}