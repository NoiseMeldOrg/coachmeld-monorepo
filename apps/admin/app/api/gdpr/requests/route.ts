import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GDPRRequest, CreateGDPRRequestPayload, GDPRRequestStats, mapAccountDeletionToGDPR } from '@/types/gdpr'

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
    const status = searchParams.get('status')
    const requestType = searchParams.get('type')
    const userId = searchParams.get('user_id')
    const includeStats = searchParams.get('include_stats') === 'true'
    const source = searchParams.get('source') || 'all' // 'mobile', 'gdpr', or 'all'

    let allRequests: GDPRRequest[] = []

    // Fetch mobile app deletion requests
    if (source === 'mobile' || source === 'all') {
      let mobileQuery = supabase
        .from('account_deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false })

      // Apply filters
      if (status && status !== 'all') {
        mobileQuery = mobileQuery.eq('status', status)
      }
      if (userId) {
        mobileQuery = mobileQuery.eq('user_id', userId)
      }
      // Mobile app only has deletion requests
      if (requestType && requestType !== 'all' && requestType !== 'delete') {
        mobileQuery = mobileQuery.eq('id', 'impossible-uuid') // Return no results
      }

      const { data: mobileRequests, error: mobileError } = await mobileQuery

      if (mobileError) {
        console.error('Error fetching mobile deletion requests:', mobileError)
      } else if (mobileRequests) {
        // Map requests without fetching user details (since we don't have permission)
        const requestsWithUserInfo = mobileRequests.map((req) => {
          const mappedRequest = mapAccountDeletionToGDPR(req)
          
          // Calculate SLA status
          const requestDate = new Date(req.requested_at)
          const now = new Date()
          const deadline = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
          const warningDate = new Date(requestDate.getTime() + 27 * 24 * 60 * 60 * 1000) // 27 days
          
          mappedRequest.sla_deadline = deadline.toISOString()
          if (req.status === 'completed' || req.status === 'cancelled') {
            mappedRequest.sla_status = null
          } else if (now > deadline) {
            mappedRequest.sla_status = 'overdue'
          } else if (now > warningDate) {
            mappedRequest.sla_status = 'warning'
          } else {
            mappedRequest.sla_status = 'on_track'
          }
          
          // Use email from the request itself (already stored in account_deletion_requests)
          mappedRequest.user_email = req.email
          mappedRequest.user_full_name = undefined // We can't get this without auth.users access

          return mappedRequest
        })
        
        allRequests = [...allRequests, ...requestsWithUserInfo]
      }
    }

    // Fetch GDPR requests if they exist
    if (source === 'gdpr' || source === 'all') {
      let gdprQuery = supabase
        .from('gdpr_requests_overview')
        .select('*')
        .order('requested_at', { ascending: false })

      // Apply filters
      if (status && status !== 'all') {
        gdprQuery = gdprQuery.eq('status', status)
      }
      if (requestType && requestType !== 'all') {
        gdprQuery = gdprQuery.eq('request_type', requestType)
      }
      if (userId) {
        gdprQuery = gdprQuery.eq('user_id', userId)
      }

      const { data: gdprRequests, error: gdprError } = await gdprQuery

      if (!gdprError && gdprRequests) {
        // For deletion requests, fetch deletion details
        const requestsWithDetails = await Promise.all(
          gdprRequests.map(async (request: any) => {
            if (request.request_type === 'delete') {
              const { data: deletionDetails } = await supabase
                .from('gdpr_deletion_details')
                .select('*')
                .eq('request_id', request.id)
                .single()

              return {
                ...request,
                deletion_details: deletionDetails
              }
            }
            return request
          })
        )
        
        allRequests = [...allRequests, ...requestsWithDetails]
      }
    }

    // Sort combined results by requested_at (newest first)
    allRequests.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())

    // Get stats if requested
    let stats: GDPRRequestStats | null = null
    if (includeStats) {
      if (source === 'mobile') {
        // Use mobile-specific stats
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_mobile_deletion_stats')

        if (!statsError && statsData) {
          stats = statsData
        }
      } else if (source === 'gdpr') {
        // Use GDPR-specific stats
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_gdpr_stats')

        if (!statsError && statsData) {
          stats = statsData
        }
      } else {
        // Calculate combined stats from all requests
        stats = {
          total: allRequests.length,
          pending: allRequests.filter(r => r.status === 'pending').length,
          processing: allRequests.filter(r => r.status === 'processing').length,
          completed: allRequests.filter(r => r.status === 'completed').length,
          failed: allRequests.filter(r => r.status === 'failed').length,
          cancelled: allRequests.filter(r => r.status === 'cancelled').length,
          overdue: allRequests.filter(r => r.sla_status === 'overdue').length,
          dueSoon: allRequests.filter(r => r.sla_status === 'warning').length,
        }
      }
    }

    return NextResponse.json({
      requests: allRequests,
      stats
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
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

    const payload: CreateGDPRRequestPayload = await request.json()

    // Validate required fields
    if (!payload.user_id || !payload.request_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If this is a mobile app deletion request, create it in account_deletion_requests
    if (payload.request_type === 'delete' && payload.metadata?.source === 'mobile_app') {
      // We need the email to be provided in the payload since we can't access auth.users
      if (!payload.requested_by) {
        return NextResponse.json({ error: 'Email (requested_by) is required for mobile deletion requests' }, { status: 400 })
      }

      const { data: deletionRequest, error: deletionError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: payload.user_id,
          email: payload.requested_by, // Use the provided email
          reason: payload.deletion_details?.deletion_reason || payload.notes,
          status: 'pending',
          notes: payload.notes
        })
        .select()
        .single()

      if (deletionError) {
        console.error('Error creating deletion request:', deletionError)
        return NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 })
      }

      return NextResponse.json({
        request: deletionRequest,
        message: 'Account deletion request created successfully'
      })
    }

    // Otherwise, use the original GDPR flow
    const { data: gdprRequest, error: requestError } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: payload.user_id,
        request_type: payload.request_type,
        requested_by: payload.requested_by || user.email,
        notes: payload.notes,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating GDPR request:', requestError)
      return NextResponse.json({ error: 'Failed to create GDPR request' }, { status: 500 })
    }

    // If it's a deletion request, create deletion details
    if (payload.request_type === 'delete' && payload.deletion_details) {
      const gracePeriodEnds = payload.deletion_details.soft_delete
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : null

      const { error: detailsError } = await supabase
        .from('gdpr_deletion_details')
        .insert({
          request_id: gdprRequest.id,
          soft_delete: payload.deletion_details.soft_delete,
          deletion_reason: payload.deletion_details.deletion_reason,
          included_data: payload.deletion_details.included_data || [],
          excluded_data: payload.deletion_details.excluded_data || [],
          grace_period_ends: gracePeriodEnds
        })

      if (detailsError) {
        console.error('Error creating deletion details:', detailsError)
        // Rollback the request
        await supabase.from('gdpr_requests').delete().eq('id', gdprRequest.id)
        return NextResponse.json({ error: 'Failed to create deletion details' }, { status: 500 })
      }
    }

    // Log the action
    await supabase
      .from('gdpr_audit_log')
      .insert({
        admin_id: user.id,
        action: 'create_gdpr_request',
        resource_type: 'gdpr_request',
        resource_id: gdprRequest.id,
        changes: payload,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      request: gdprRequest,
      message: `GDPR ${payload.request_type} request created successfully`
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}