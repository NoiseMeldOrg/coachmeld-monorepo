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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const requestType = searchParams.get('type')
    const userId = searchParams.get('user_id')
    const includeStats = searchParams.get('include_stats') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query for new gdpr_data_requests table
    let query = supabase
      .from('gdpr_data_requests')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (requestType && requestType !== 'all') {
      query = query.eq('request_type', requestType)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: gdprRequests, error: gdprError } = await query

    if (gdprError) {
      console.error('Error fetching GDPR requests:', gdprError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Calculate SLA status for each request
    const requestsWithSLA = gdprRequests?.map((req) => {
      const requestDate = new Date(req.created_at)
      const now = new Date()
      const deadline = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      const warningDate = new Date(requestDate.getTime() + 27 * 24 * 60 * 60 * 1000) // 27 days
      
      // Calculate SLA status
      let sla_status = null
      if (req.status === 'completed' || req.status === 'cancelled') {
        sla_status = null
      } else if (now > deadline) {
        sla_status = 'overdue'
      } else if (now > warningDate) {
        sla_status = 'warning'
      } else {
        sla_status = 'on_track'
      }
      
      return {
        ...req,
        sla_deadline: deadline.toISOString(),
        sla_status,
        user_email: req.profiles?.email || null,
        user_full_name: req.profiles?.full_name || null
      }
    }) || []

    // Get stats if requested
    let stats = null
    if (includeStats) {
      // Calculate stats from current results
      stats = {
        total: requestsWithSLA.length,
        pending: requestsWithSLA.filter(r => r.status === 'pending').length,
        processing: requestsWithSLA.filter(r => r.status === 'processing').length,
        completed: requestsWithSLA.filter(r => r.status === 'completed').length,
        failed: requestsWithSLA.filter(r => r.status === 'failed').length,
        cancelled: requestsWithSLA.filter(r => r.status === 'cancelled').length,
        overdue: requestsWithSLA.filter(r => r.sla_status === 'overdue').length,
        dueSoon: requestsWithSLA.filter(r => r.sla_status === 'warning').length,
      }
    }

    return NextResponse.json({
      requests: requestsWithSLA,
      stats,
      pagination: {
        page,
        limit,
        total: requestsWithSLA.length,
        has_more: requestsWithSLA.length === limit
      }
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

    const payload = await request.json()

    // Validate required fields
    if (!payload.user_id || !payload.request_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create GDPR data request using new schema
    const { data: gdprRequest, error: requestError } = await supabase
      .from('gdpr_data_requests')
      .insert({
        user_id: payload.user_id,
        request_type: payload.request_type,
        status: 'pending',
        request_details: payload.request_details || {},
        notes: payload.notes || null,
        expires_at: payload.request_type === 'export' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days for exports
          : null
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating GDPR request:', requestError)
      return NextResponse.json({ error: 'Failed to create GDPR request' }, { status: 500 })
    }

    // Log the action using the log_gdpr_action function
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'create_data_request',
        p_resource_type: 'gdpr_data_request',
        p_resource_id: gdprRequest.id,
        p_changes: payload,
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging audit trail:', auditError)
      // Don't fail the request for audit errors, just log
    }

    return NextResponse.json({
      success: true,
      request_id: gdprRequest.id,
      status: gdprRequest.status,
      estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours estimate
      message: `GDPR ${payload.request_type} request created successfully`
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}