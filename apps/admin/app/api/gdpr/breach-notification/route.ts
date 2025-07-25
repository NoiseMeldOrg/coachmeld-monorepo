/**
 * GDPR Breach Notification API
 * Handles data breach reporting and 72-hour notification compliance
 * Implements GDPR Article 33 and Article 34 requirements
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

    // TODO: Add admin permission check
    // This is a critical security endpoint

    const payload = await request.json()

    // Validate required fields for breach notification
    const requiredFields = ['breach_type', 'description', 'affected_data_categories', 'discovery_date']
    const missingFields = requiredFields.filter(field => !payload[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 })
    }

    // Validate breach_type enum
    const validBreachTypes = [
      'confidentiality_breach', 'integrity_breach', 'availability_breach', 'combined_breach'
    ]
    if (!validBreachTypes.includes(payload.breach_type)) {
      return NextResponse.json({ 
        error: `Invalid breach_type. Must be one of: ${validBreachTypes.join(', ')}` 
      }, { status: 400 })
    }

    const discoveryDate = new Date(payload.discovery_date)
    const now = new Date()
    const hoursElapsed = (now.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60)
    const seventyTwoHourDeadline = new Date(discoveryDate.getTime() + (72 * 60 * 60 * 1000))

    // Determine if this requires supervisory authority notification (Article 33)
    const requiresAuthorityNotification = determineAuthorityNotificationRequired(payload)
    
    // Determine if this requires individual notification (Article 34)
    const requiresIndividualNotification = determineIndividualNotificationRequired(payload)

    // Create breach record - this should also be created in a dedicated breach table
    const breachRecord = {
      id: generateBreachId(),
      breach_type: payload.breach_type,
      description: payload.description,
      affected_data_categories: payload.affected_data_categories,
      estimated_affected_individuals: payload.estimated_affected_individuals || 0,
      discovery_date: payload.discovery_date,
      notification_date: now.toISOString(),
      reported_by: user.id,
      severity_assessment: payload.severity_assessment || 'medium',
      likely_consequences: payload.likely_consequences || [],
      mitigation_measures: payload.mitigation_measures || [],
      status: 'reported',
      requires_authority_notification: requiresAuthorityNotification,
      requires_individual_notification: requiresIndividualNotification,
      authority_notification_deadline: seventyTwoHourDeadline.toISOString(),
      authority_notified_at: null,
      individuals_notified_at: null
    }

    // For this implementation, we'll store in the audit log with special handling
    // In production, you'd want a dedicated gdpr_breach_notifications table
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'report_data_breach',
        p_resource_type: 'data_breach',
        p_resource_id: breachRecord.id,
        p_changes: breachRecord,
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging breach report:', auditError)
      return NextResponse.json({ error: 'Failed to log breach report' }, { status: 500 })
    }

    // Prepare response with compliance information
    const response = {
      success: true,
      breach_id: breachRecord.id,
      breach_reference: `BREACH-${breachRecord.id}`,
      reported_at: now.toISOString(),
      compliance_status: {
        hours_since_discovery: Math.round(hoursElapsed * 10) / 10,
        within_72_hour_window: hoursElapsed <= 72,
        authority_notification_required: requiresAuthorityNotification,
        authority_notification_deadline: seventyTwoHourDeadline.toISOString(),
        individual_notification_required: requiresIndividualNotification,
        individual_notification_deadline: requiresIndividualNotification 
          ? new Date(now.getTime() + (72 * 60 * 60 * 1000)).toISOString() // 72 hours from now
          : null
      },
      next_actions: generateNextActions(breachRecord, hoursElapsed),
      breach_assessment: {
        severity: payload.severity_assessment || 'medium',
        likely_consequences: payload.likely_consequences || [],
        risk_to_individuals: assessRiskToIndividuals(payload)
      }
    }

    // If we're approaching or past the 72-hour deadline, include urgent warnings
    if (hoursElapsed > 60) {
      response.compliance_status = {
        ...response.compliance_status,
        urgent_warning: `Only ${Math.max(0, 72 - hoursElapsed).toFixed(1)} hours remaining to notify supervisory authority`
      } as any
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Unexpected error in breach notification:', error)
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const breachType = searchParams.get('breach_type')

    // Query breach records from audit log
    // In production, you'd query a dedicated breach table
    let query = supabase
      .from('gdpr_audit_log')
      .select('*')
      .eq('action', 'report_data_breach')
      .order('created_at', { ascending: false })

    const { data: breachLogs, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching breach records:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform audit logs back to breach records
    const breachRecords = breachLogs?.map(log => ({
      ...log.changes,
      reported_at: log.created_at,
      reported_by_email: log.admin_id // You'd need to join with user info
    })) || []

    // Apply filters
    let filteredRecords = breachRecords
    if (status) {
      filteredRecords = filteredRecords.filter(record => record.status === status)
    }
    if (breachType) {
      filteredRecords = filteredRecords.filter(record => record.breach_type === breachType)
    }

    // Calculate compliance metrics
    const metrics = {
      total_breaches: filteredRecords.length,
      within_72h_compliance: filteredRecords.filter(b => {
        const discovery = new Date(b.discovery_date)
        const notification = new Date(b.authority_notified_at || b.reported_at)
        const hoursElapsed = (notification.getTime() - discovery.getTime()) / (1000 * 60 * 60)
        return hoursElapsed <= 72
      }).length,
      pending_notifications: filteredRecords.filter(b => 
        b.requires_authority_notification && !b.authority_notified_at
      ).length,
      average_notification_time: calculateAverageNotificationTime(filteredRecords)
    }

    return NextResponse.json({
      breach_records: filteredRecords,
      compliance_metrics: metrics,
      total: filteredRecords.length
    })
  } catch (error: any) {
    console.error('Unexpected error fetching breach records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate unique breach ID
function generateBreachId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${randomStr}`.toUpperCase()
}

// Helper function to determine if supervisory authority notification is required (Article 33)
function determineAuthorityNotificationRequired(payload: any): boolean {
  // GDPR Article 33: Notification required unless "unlikely to result in a risk"
  const highRiskFactors = [
    payload.estimated_affected_individuals > 100,
    payload.affected_data_categories?.includes('special_categories'),
    payload.affected_data_categories?.includes('financial_data'),
    payload.breach_type === 'confidentiality_breach',
    payload.severity_assessment === 'high'
  ]

  return highRiskFactors.some(factor => factor === true)
}

// Helper function to determine if individual notification is required (Article 34)
function determineIndividualNotificationRequired(payload: any): boolean {
  // GDPR Article 34: Individual notification required if "high risk"
  const highRiskToIndividuals = [
    payload.estimated_affected_individuals > 0,
    payload.affected_data_categories?.includes('special_categories'),
    payload.affected_data_categories?.includes('financial_data'),
    payload.likely_consequences?.includes('identity_theft'),
    payload.likely_consequences?.includes('financial_loss'),
    payload.severity_assessment === 'high'
  ]

  return highRiskToIndividuals.filter(factor => factor === true).length >= 2
}

// Helper function to assess risk to individuals
function assessRiskToIndividuals(payload: any): string {
  const riskFactors = [
    payload.affected_data_categories?.includes('special_categories'),
    payload.affected_data_categories?.includes('financial_data'),
    payload.breach_type === 'confidentiality_breach',
    payload.estimated_affected_individuals > 1000,
    payload.likely_consequences?.includes('identity_theft')
  ]

  const riskScore = riskFactors.filter(factor => factor === true).length

  if (riskScore >= 3) return 'high'
  if (riskScore >= 1) return 'medium'
  return 'low'
}

// Helper function to generate next actions based on breach details
function generateNextActions(breachRecord: any, hoursElapsed: number): string[] {
  const actions = []

  if (breachRecord.requires_authority_notification && !breachRecord.authority_notified_at) {
    if (hoursElapsed > 72) {
      actions.push('🚨 URGENT: Notify supervisory authority immediately (deadline exceeded)')
    } else {
      actions.push(`📋 Notify supervisory authority within ${(72 - hoursElapsed).toFixed(1)} hours`)
    }
  }

  if (breachRecord.requires_individual_notification && !breachRecord.individuals_notified_at) {
    actions.push('👥 Prepare individual notifications for affected data subjects')
  }

  actions.push('📝 Document containment and mitigation measures taken')
  actions.push('🔍 Conduct full impact assessment')
  actions.push('🛡️ Review and update security measures to prevent recurrence')

  return actions
}

// Helper function to calculate average notification time
function calculateAverageNotificationTime(breachRecords: any[]): number {
  const notifiedBreaches = breachRecords.filter(b => b.authority_notified_at)
  
  if (notifiedBreaches.length === 0) return 0

  const totalHours = notifiedBreaches.reduce((sum, breach) => {
    const discovery = new Date(breach.discovery_date)
    const notification = new Date(breach.authority_notified_at)
    const hours = (notification.getTime() - discovery.getTime()) / (1000 * 60 * 60)
    return sum + hours
  }, 0)

  return Math.round((totalHours / notifiedBreaches.length) * 10) / 10
}