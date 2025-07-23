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
    const format = searchParams.get('format') || 'csv'
    const source = searchParams.get('source') || 'all'
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('account_deletion_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (startDate) {
      query = query.gte('requested_at', startDate)
    }
    if (endDate) {
      query = query.lte('requested_at', endDate)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching deletion requests:', error)
      return NextResponse.json({ error: 'Failed to fetch deletion requests' }, { status: 500 })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Request ID',
        'User ID',
        'Email',
        'Full Name',
        'Reason',
        'Status',
        'Requested At',
        'Hours Pending',
        'Processed At',
        'Processed By',
        'Admin Notes',
        'SLA Status'
      ]

      const rows = await Promise.all((requests || []).map(async (req) => {
        const requestDate = new Date(req.requested_at)
        const now = new Date()
        const hoursPending = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60))
        const deadline = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        
        let slaStatus = 'on_track'
        if (req.status === 'completed' || req.status === 'cancelled') {
          slaStatus = 'completed'
        } else if (now > deadline) {
          slaStatus = 'overdue'
        } else if (now > new Date(requestDate.getTime() + 27 * 24 * 60 * 60 * 1000)) {
          slaStatus = 'warning'
        }

        // We can't fetch user details due to auth.users permissions
        let fullName = ''
        let adminEmail = ''

        return [
          req.id,
          req.user_id,
          req.email,
          fullName,
          req.reason || '',
          req.status,
          new Date(req.requested_at).toISOString(),
          req.status === 'pending' || req.status === 'processing' ? hoursPending : '',
          req.processed_at ? new Date(req.processed_at).toISOString() : '',
          adminEmail,
          req.notes || '',
          slaStatus
        ]
      }))

      // Escape CSV values
      const escapeCSV = (value: any) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n')

      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="deletion_requests_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Return JSON if format is not CSV
    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}