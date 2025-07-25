/**
 * GDPR Compliance Reporting API
 * Generates comprehensive compliance reports for admin oversight
 * Tracks SLA compliance, request patterns, and legal requirements
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

    // TODO: Add admin permission check
    // For now, assume all authenticated users are admins

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const includeDetails = searchParams.get('include_details') === 'true'

    // Default to current month if no dates provided
    const defaultStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const defaultEndDate = endDate || new Date().toISOString().split('T')[0]

    // Validate date range
    const start = new Date(defaultStartDate)
    const end = new Date(defaultEndDate)
    
    if (start > end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    const reportPeriod = `${defaultStartDate} to ${defaultEndDate}`

    // Fetch GDPR requests in the date range
    const { data: gdprRequests, error: requestsError } = await supabase
      .from('gdpr_data_requests')
      .select('*')
      .gte('created_at', `${defaultStartDate}T00:00:00Z`)
      .lte('created_at', `${defaultEndDate}T23:59:59Z`)
      .order('created_at', { ascending: true })

    if (requestsError) {
      console.error('Error fetching GDPR requests:', requestsError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Calculate compliance metrics
    const totalRequests = gdprRequests?.length || 0
    let completedOnTime = 0
    let overdueRequests = 0
    let pendingRequests = 0
    const processingTimes: number[] = []

    const requestBreakdown = {
      export: 0,
      deletion: 0,
      correction: 0,
      other: 0
    }

    gdprRequests?.forEach(req => {
      // Count by type
      if (req.request_type === 'export') requestBreakdown.export++
      else if (req.request_type === 'deletion') requestBreakdown.deletion++
      else if (req.request_type === 'correction') requestBreakdown.correction++
      else requestBreakdown.other++

      // Calculate SLA compliance
      const createdAt = new Date(req.created_at)
      const deadline = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      const now = new Date()

      if (req.status === 'completed' && req.completed_at) {
        const completedAt = new Date(req.completed_at)
        if (completedAt <= deadline) {
          completedOnTime++
        }
        
        // Calculate processing time in hours
        const processingTimeHours = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
        processingTimes.push(processingTimeHours)
      } else if (req.status === 'pending' || req.status === 'processing' || req.status === 'approved') {
        if (now > deadline) {
          overdueRequests++
        } else {
          pendingRequests++
        }
      }
    })

    const slaComplianceRate = totalRequests > 0 ? Math.round((completedOnTime / totalRequests) * 100 * 10) / 10 : 100

    // Calculate average processing time
    const averageProcessingTime = processingTimes.length > 0 
      ? Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length)
      : 0

    // Fetch consent metrics
    const { data: consentRecords, error: consentError } = await supabase
      .from('gdpr_consent_records')
      .select('*')
      .gte('created_at', `${defaultStartDate}T00:00:00Z`)
      .lte('created_at', `${defaultEndDate}T23:59:59Z`)

    let consentMetrics = {
      total_consents: 0,
      consents_granted: 0,
      consents_withdrawn: 0,
      consent_rate: 0
    }

    if (!consentError && consentRecords) {
      consentMetrics.total_consents = consentRecords.length
      consentMetrics.consents_granted = consentRecords.filter(c => c.consent_given).length
      consentMetrics.consents_withdrawn = consentRecords.filter(c => !c.consent_given).length
      consentMetrics.consent_rate = consentRecords.length > 0 
        ? Math.round((consentMetrics.consents_granted / consentRecords.length) * 100)
        : 0
    }

    // Check for any breach incidents (should be rare/zero)
    const breachIncidents = 0 // TODO: Implement breach tracking if needed

    // Build the compliance report
    const complianceReport = {
      period: reportPeriod,
      generated_at: new Date().toISOString(),
      
      // Core metrics
      total_requests: totalRequests,
      completed_on_time: completedOnTime,
      overdue_requests: overdueRequests,
      pending_requests: pendingRequests,
      sla_compliance_rate: slaComplianceRate,
      
      // Request breakdown
      request_breakdown: requestBreakdown,
      
      // Performance metrics
      average_processing_time: `${averageProcessingTime} hours`,
      median_processing_time: processingTimes.length > 0 
        ? `${calculateMedian(processingTimes)} hours`
        : '0 hours',
      
      // Consent metrics
      consent_metrics: consentMetrics,
      
      // Security and compliance
      breach_incidents: breachIncidents,
      
      // Compliance status
      compliance_status: {
        sla_meets_target: slaComplianceRate >= 95,
        processing_time_acceptable: averageProcessingTime <= 168, // 7 days
        no_breaches: breachIncidents === 0,
        overall_status: slaComplianceRate >= 95 && averageProcessingTime <= 168 && breachIncidents === 0 
          ? 'COMPLIANT' : 'NEEDS_ATTENTION'
      }
    }

    // Add detailed breakdown if requested
    if (includeDetails && gdprRequests) {
      (complianceReport as any).detailed_requests = gdprRequests.map(req => {
        const createdAt = new Date(req.created_at)
        const deadline = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        const now = new Date()
        
        let slaStatus = 'unknown'
        if (req.status === 'completed' && req.completed_at) {
          const completedAt = new Date(req.completed_at)
          slaStatus = completedAt <= deadline ? 'met' : 'exceeded'
        } else if (req.status === 'pending' || req.status === 'processing' || req.status === 'approved') {
          slaStatus = now <= deadline ? 'on_track' : 'overdue'
        }
        
        return {
          id: req.id,
          request_type: req.request_type,
          status: req.status,
          created_at: req.created_at,
          completed_at: req.completed_at,
          sla_deadline: deadline.toISOString(),
          sla_status: slaStatus,
          processing_time_hours: req.completed_at 
            ? Math.round((new Date(req.completed_at).getTime() - createdAt.getTime()) / (1000 * 60 * 60))
            : null
        }
      })
    }

    // Log report generation
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'generate_compliance_report',
        p_resource_type: 'compliance_report',
        p_resource_id: null,
        p_changes: {
          period: reportPeriod,
          include_details: includeDetails,
          total_requests_analyzed: totalRequests
        },
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging compliance report generation:', auditError)
    }

    return NextResponse.json(complianceReport)
  } catch (error: any) {
    console.error('Unexpected error in compliance report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate median
function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  } else {
    return Math.round(sorted[middle])
  }
}