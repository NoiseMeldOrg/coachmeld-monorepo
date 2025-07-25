import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

interface DeleteUserPayload {
  email: string
  userId?: string
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

    const payload: DeleteUserPayload = await request.json()

    if (!payload.email && !payload.userId) {
      return NextResponse.json({ error: 'Email or userId required' }, { status: 400 })
    }

    let targetUserId = payload.userId

    // If only email provided, find the user ID
    if (!targetUserId && payload.email) {
      const { data: authUsers, error: listError } = await serviceClient.auth.admin.listUsers()
      if (listError) {
        throw listError
      }

      const targetUser = authUsers.users.find(u => u.email === payload.email)
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      targetUserId = targetUser.id
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Could not determine user ID' }, { status: 400 })
    }

    // Delete related records first (in dependency order to avoid foreign key conflicts)
    const deletionResults: Record<string, any> = {}

    try {
      // Delete from compliance_audit_log first (has foreign key constraint)
      const { error: auditError } = await serviceClient
        .from('compliance_audit_log')
        .delete()
        .eq('user_id', targetUserId)
      deletionResults.compliance_audit_log = auditError ? `failed: ${auditError.message}` : 'success'

      // Delete from gdpr_consent_records
      const { error: consentError } = await serviceClient
        .from('gdpr_consent_records')
        .delete()
        .eq('user_id', targetUserId)
      deletionResults.gdpr_consent_records = consentError ? `failed: ${consentError.message}` : 'success'

      // Delete from gdpr_data_requests
      const { error: requestsError } = await serviceClient
        .from('gdpr_data_requests')
        .delete()
        .eq('user_id', targetUserId)
      deletionResults.gdpr_data_requests = requestsError ? `failed: ${requestsError.message}` : 'success'

      // Delete from profiles
      const { error: profileError } = await serviceClient
        .from('profiles')
        .delete()
        .eq('id', targetUserId)
      deletionResults.profiles = profileError ? `failed: ${profileError.message}` : 'success'

      // Finally delete from auth.users
      const { error: authError } = await serviceClient.auth.admin.deleteUser(targetUserId)
      deletionResults.auth_users = authError ? `failed: ${authError.message}` : 'success'

      return NextResponse.json({
        success: true,
        message: `User ${payload.email || targetUserId} deleted successfully`,
        deletionResults,
        userId: targetUserId
      })

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
        deletionResults,
        partialDeletion: true
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}