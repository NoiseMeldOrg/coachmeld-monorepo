import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateGDPRRequestPayload, mapAccountDeletionToGDPR } from '@/types/gdpr'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First, try to find in mobile app deletion requests
    const { data: mobileRequest, error: mobileError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!mobileError && mobileRequest) {
      // Map to GDPR format
      const mappedRequest = mapAccountDeletionToGDPR(mobileRequest)
      
      // Use email from the request itself
      mappedRequest.user_email = mobileRequest.email
      mappedRequest.user_full_name = undefined // Can't access auth.users
      mappedRequest.processed_by_email = undefined // Can't access auth.users

      // Fetch audit logs
      const { data: auditLogs } = await supabase
        .from('gdpr_audit_log')
        .select('*')
        .eq('resource_type', 'account_deletion_request')
        .eq('resource_id', id)
        .order('timestamp', { ascending: false })

      return NextResponse.json({
        request: mappedRequest,
        audit_logs: auditLogs || [],
        source: 'mobile'
      })
    }

    // If not found in mobile, try GDPR tables
    const { data: gdprRequest, error } = await supabase
      .from('gdpr_requests_overview')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gdprRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Fetch deletion details if it's a deletion request
    let deletionDetails = null
    if (gdprRequest.request_type === 'delete') {
      const { data } = await supabase
        .from('gdpr_deletion_details')
        .select('*')
        .eq('request_id', id)
        .single()
      
      deletionDetails = data
    }

    // Fetch audit logs for this request
    const { data: auditLogs } = await supabase
      .from('gdpr_audit_log')
      .select('*')
      .eq('resource_type', 'gdpr_request')
      .eq('resource_id', id)
      .order('timestamp', { ascending: false })

    return NextResponse.json({
      request: {
        ...gdprRequest,
        deletion_details: deletionDetails
      },
      audit_logs: auditLogs || [],
      source: 'gdpr'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const payload: UpdateGDPRRequestPayload = await request.json()
    const source = request.nextUrl.searchParams.get('source') || 'auto'

    // Check if it's a mobile app request
    const { data: mobileRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (mobileRequest) {
      // Update mobile app deletion request
      const updateData: any = {}
      
      if (payload.notes) updateData.notes = payload.notes
      if (payload.status) updateData.status = payload.status
      if (payload.status === 'processing' && mobileRequest.status !== 'processing') {
        updateData.processed_by = user.id
      }
      if ((payload.status === 'completed' || payload.status === 'cancelled') && 
          !['completed', 'cancelled'].includes(mobileRequest.status)) {
        updateData.processed_at = new Date().toISOString()
      }

      const { data: updatedRequest, error: updateError } = await supabase
        .from('account_deletion_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating mobile deletion request:', updateError)
        return NextResponse.json({ error: 'Failed to update deletion request' }, { status: 500 })
      }

      // Log the action
      await supabase
        .from('gdpr_audit_log')
        .insert({
          admin_id: user.id,
          action: 'update_mobile_deletion_request',
          resource_type: 'account_deletion_request',
          resource_id: id,
          changes: {
            before: mobileRequest,
            after: updatedRequest,
            fields_changed: Object.keys(updateData)
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        })

      return NextResponse.json({
        request: updatedRequest,
        message: 'Deletion request updated successfully'
      })
    }

    // Otherwise, handle GDPR request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'GDPR request not found' }, { status: 404 })
    }

    // Build update object
    const updateData: any = {
      ...payload,
      updated_at: new Date().toISOString()
    }

    // If status is being changed to processing, set the processor
    if (payload.status === 'processing' && currentRequest.status !== 'processing') {
      updateData.processed_by = user.id
    }

    // If status is being completed, set completion time
    if (payload.status === 'completed' && currentRequest.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('gdpr_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating GDPR request:', updateError)
      return NextResponse.json({ error: 'Failed to update GDPR request' }, { status: 500 })
    }

    // Log the action
    await supabase
      .from('gdpr_audit_log')
      .insert({
        admin_id: user.id,
        action: 'update_gdpr_request',
        resource_type: 'gdpr_request',
        resource_id: id,
        changes: {
          before: currentRequest,
          after: updatedRequest,
          fields_changed: Object.keys(payload)
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      request: updatedRequest,
      message: 'GDPR request updated successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const reason = body.reason || ''

    // Check if it's a mobile app request
    const { data: mobileRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (mobileRequest) {
      // Only allow cancellation of pending or processing requests
      if (!['pending', 'processing'].includes(mobileRequest.status)) {
        return NextResponse.json({ 
          error: 'Can only cancel pending or processing requests' 
        }, { status: 400 })
      }

      // Use the process_deletion_request function to cancel
      const { data: result, error: cancelError } = await supabase
        .rpc('process_deletion_request', {
          request_id: id,
          action: 'cancel',
          admin_notes: reason || 'Cancelled by admin'
        })

      if (cancelError) {
        console.error('Error cancelling mobile deletion request:', cancelError)
        return NextResponse.json({ error: 'Failed to cancel deletion request' }, { status: 500 })
      }

      // Log the action
      await supabase
        .from('gdpr_audit_log')
        .insert({
          admin_id: user.id,
          action: 'cancel_mobile_deletion_request',
          resource_type: 'account_deletion_request',
          resource_id: id,
          changes: {
            status_before: mobileRequest.status,
            status_after: 'cancelled',
            reason
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        })

      return NextResponse.json({
        message: 'Deletion request cancelled successfully'
      })
    }

    // Otherwise, handle GDPR request
    const { data: gdprRequest, error: fetchError } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !gdprRequest) {
      return NextResponse.json({ error: 'GDPR request not found' }, { status: 404 })
    }

    // Only allow cancellation of pending or processing requests
    if (!['pending', 'processing'].includes(gdprRequest.status)) {
      return NextResponse.json({ 
        error: 'Can only cancel pending or processing requests' 
      }, { status: 400 })
    }

    // Update status to cancelled
    const cancelNotes = reason ? 
      `${gdprRequest.notes || ''}\n\nCancellation reason: ${reason}\nCancelled by ${user.email} at ${new Date().toISOString()}` :
      `${gdprRequest.notes || ''}\n\nCancelled by ${user.email} at ${new Date().toISOString()}`

    const { error: updateError } = await supabase
      .from('gdpr_requests')
      .update({
        status: 'cancelled',
        processed_by: user.id,
        completed_at: new Date().toISOString(),
        notes: cancelNotes
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error cancelling GDPR request:', updateError)
      return NextResponse.json({ error: 'Failed to cancel GDPR request' }, { status: 500 })
    }

    // Log the action
    await supabase
      .from('gdpr_audit_log')
      .insert({
        admin_id: user.id,
        action: 'cancel_gdpr_request',
        resource_type: 'gdpr_request',
        resource_id: id,
        changes: {
          status_before: gdprRequest.status,
          status_after: 'cancelled',
          reason
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      message: 'GDPR request cancelled successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}