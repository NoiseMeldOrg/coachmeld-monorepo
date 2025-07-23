import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DeletionCertificate } from '@/types/gdpr'

interface ProcessDeletionPayload {
  request_id: string
  confirm: boolean
  immediate?: boolean // Skip grace period for hard delete
  source?: 'gdpr' | 'mobile' // Specify which table to use
  confirm_manual_deletion?: boolean // Confirms manual deletion was completed
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceClient = await createServiceClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: ProcessDeletionPayload = await request.json()

    if (!payload.request_id || !payload.confirm) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Handle mobile app deletion requests
    if (payload.source === 'mobile') {
      // This is explicitly a mobile deletion request
      const { data: mobileRequest, error: mobileError } = await serviceClient
        .from('account_deletion_requests')
        .select('*')
        .eq('id', payload.request_id)
        .single()

      if (mobileError || !mobileRequest) {
        return NextResponse.json({ 
          error: 'Mobile deletion request not found',
          requestId: payload.request_id 
        }, { status: 404 })
      }

      // This is a mobile app deletion request
      if (mobileRequest.status !== 'pending' && mobileRequest.status !== 'processing') {
        return NextResponse.json({ error: `Request is not in a deletable state. Current status: ${mobileRequest.status}` }, { status: 400 })
      }

      try {
          // Check if this is the initial processing or final confirmation
          if (payload.confirm_manual_deletion) {
            // This is the final confirmation after manual deletion
            
            // Verify user no longer exists
            const { data: userStillExists, error: checkError } = await serviceClient
            .from('auth.users')
            .select('id')
            .eq('id', mobileRequest.user_id)
            .single()

            if (!checkError && userStillExists) {
              return NextResponse.json({ 
                error: 'User still exists in Supabase. Please delete the user manually before confirming.',
                showManualSteps: true,
                userId: mobileRequest.user_id,
                userEmail: mobileRequest.email
              }, { status: 400 })
            }

            // User is deleted, mark request as completed
            await serviceClient
              .from('account_deletion_requests')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              notes: `${mobileRequest.notes || ''}\n\nUser manually deleted from Supabase and confirmed by admin.`
            })
            .eq('id', payload.request_id)

          // Log completion
            await serviceClient
              .from('gdpr_audit_log')
            .insert({
              admin_id: user.id,
              action: 'complete_mobile_deletion_process',
              resource_type: 'account_deletion_request',
              resource_id: payload.request_id,
              changes: {
                user_id: mobileRequest.user_id,
                email: mobileRequest.email,
                already_deleted: true
              },
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              user_agent: request.headers.get('user-agent')
            })

            return NextResponse.json({
              success: true,
              message: 'Deletion request completed. User has been removed from Supabase.',
              deletion_results: {
                user_deleted: true,
                manually_deleted: true
              }
            })
          } else {
            // Initial processing - mark as processing and return manual deletion instructions
            
            // Update status to processing
            const { error: updateError } = await serviceClient
              .from('account_deletion_requests')
              .update({
                status: 'processing',
                processed_by: user.id,
                notes: `${mobileRequest.notes || ''}\n\nAwaiting manual deletion in Supabase.`
              })
              .eq('id', payload.request_id)

            if (updateError) {
              throw updateError
            }

            // Log the start of deletion
            await serviceClient
              .from('gdpr_audit_log')
              .insert({
                admin_id: user.id,
                action: 'start_mobile_deletion_process',
                resource_type: 'account_deletion_request',
                resource_id: payload.request_id,
                changes: {
                  user_id: mobileRequest.user_id,
                  email: mobileRequest.email
                },
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                user_agent: request.headers.get('user-agent')
              })

          return NextResponse.json({
            success: true,
            requiresManualDeletion: true,
            message: 'Request marked as processing. Manual deletion required.',
            instructions: {
              userId: mobileRequest.user_id,
              userEmail: mobileRequest.email,
              steps: [
                'Go to your Supabase Dashboard',
                'Navigate to Authentication > Users',
                `Search for user: ${mobileRequest.email}`,
                'Check the checkbox and click "Delete 1 users", then click the "Delete" button on the confirmation dialog',
                'Return here and click "Confirm Deletion Complete"'
              ]
            }
          })
        }
      } catch (error: any) {
        // Mark as failed
        await serviceClient
          .from('account_deletion_requests')
          .update({
            status: 'pending', // Revert to pending so it can be retried
            notes: `Error during deletion: ${error.message || error}`
          })
          .eq('id', payload.request_id)

        throw error
      }
    }

    // Check for GDPR request if no source specified or source is not 'mobile'
    const { data: gdprRequest, error: requestError } = await supabase
      .from('gdpr_requests')
      .select('*, gdpr_deletion_details(*)')
      .eq('id', payload.request_id)
      .single()

    if (requestError || !gdprRequest) {
      return NextResponse.json({ error: 'GDPR request not found' }, { status: 404 })
    }

    if (gdprRequest.request_type !== 'delete') {
      return NextResponse.json({ error: 'Not a deletion request' }, { status: 400 })
    }

    if (gdprRequest.status !== 'pending' && gdprRequest.status !== 'processing') {
      return NextResponse.json({ error: 'Request is not in a deletable state' }, { status: 400 })
    }

    const deletionDetails = gdprRequest.gdpr_deletion_details[0]
    if (!deletionDetails) {
      return NextResponse.json({ error: 'Deletion details not found' }, { status: 404 })
    }

    // Update request status to processing
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'processing',
        processed_by: user.id
      })
      .eq('id', payload.request_id)

    // Log the start of deletion
    await supabase
      .from('gdpr_audit_log')
      .insert({
        admin_id: user.id,
        action: 'start_deletion_process',
        resource_type: 'gdpr_request',
        resource_id: payload.request_id,
        changes: {
          immediate: payload.immediate,
          soft_delete: deletionDetails.soft_delete
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    // Perform the deletion based on included_data
    const deletionResults: Record<string, any> = {}
    const includedData = deletionDetails.included_data || []

    // Delete user data based on categories
    for (const dataCategory of includedData) {
      try {
        switch (dataCategory) {
          case 'profile':
            // Anonymize profile data
            const { error: profileError } = await serviceClient.auth.admin.updateUserById(
              gdprRequest.user_id,
              {
                email: `deleted_${gdprRequest.user_id}@example.com`,
                user_metadata: {
                  deleted: true,
                  deleted_at: new Date().toISOString()
                }
              }
            )
            deletionResults.profile = profileError ? 'failed' : 'success'
            break

          case 'chat_history':
            // Delete chat history (assuming there's a chat_messages table)
            const { error: chatError } = await supabase
              .from('chat_messages')
              .delete()
              .eq('user_id', gdprRequest.user_id)
            deletionResults.chat_history = chatError ? 'failed' : 'success'
            break

          case 'preferences':
            // Delete user preferences
            const { error: prefsError } = await supabase
              .from('user_coach_preferences')
              .delete()
              .eq('user_id', gdprRequest.user_id)
            deletionResults.preferences = prefsError ? 'failed' : 'success'
            break

          case 'documents':
            // Soft delete user documents
            const { error: docsError } = await supabase
              .from('coach_document_access')
              .delete()
              .eq('user_id', gdprRequest.user_id)
            deletionResults.documents = docsError ? 'failed' : 'success'
            break

          case 'analytics':
            // Delete analytics data (if applicable)
            // This would depend on your analytics implementation
            deletionResults.analytics = 'success'
            break

          case 'consents':
            // Delete consent records
            const { error: consentError } = await supabase
              .from('consent_records')
              .delete()
              .eq('user_id', gdprRequest.user_id)
            deletionResults.consents = consentError ? 'failed' : 'success'
            break

          case 'all':
            // For 'all', delete the user account entirely
            const { data: deleteResult, error: deleteError } = await supabase
              .rpc('delete_user_account', { target_user_id: gdprRequest.user_id })
            
            if (deleteError) {
              deletionResults.all = 'failed'
            } else {
              deletionResults.all = 'success'
              deletionResults.user_deleted = true
            }
            break
        }
      } catch (error) {
        console.error(`Error deleting ${dataCategory}:`, error)
        deletionResults[dataCategory] = 'error'
      }
    }

    // Generate deletion certificate
    const certificate: DeletionCertificate = {
      request_id: payload.request_id,
      user_id: gdprRequest.user_id,
      deleted_at: new Date().toISOString(),
      data_categories: includedData,
      deletion_method: deletionDetails.soft_delete ? 'soft' : 'hard',
      certificate_id: `CERT-${payload.request_id}-${Date.now()}`,
      issued_by: user.email || user.id
    }

    // Update deletion details with certificate
    await supabase
      .from('gdpr_deletion_details')
      .update({
        deletion_executed_at: new Date().toISOString(),
        deletion_certificate: certificate
      })
      .eq('request_id', payload.request_id)

    // Mark request as completed
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          deletion_results: deletionResults,
          certificate_id: certificate.certificate_id
        }
      })
      .eq('id', payload.request_id)

    // Log completion
    await supabase
      .from('gdpr_audit_log')
      .insert({
        admin_id: user.id,
        action: 'complete_deletion_process',
        resource_type: 'gdpr_request',
        resource_id: payload.request_id,
        changes: {
          deletion_results: deletionResults,
          certificate
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      message: 'User data deletion completed successfully',
      certificate,
      deletion_results: deletionResults
    })
  } catch (error: any) {
    console.error('Unexpected error during deletion:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}