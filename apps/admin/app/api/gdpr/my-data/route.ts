/**
 * GDPR Data Export API
 * Provides comprehensive user data export functionality
 * Implements GDPR Article 15 (Right of Access) requirements
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
    const format = searchParams.get('format') || 'json'
    const userId = searchParams.get('user_id') || user.id // Allow admin to export any user's data

    // Rate limiting: Check for recent export requests (1 per day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentExports, error: rateLimitError } = await supabase
      .from('gdpr_data_requests')
      .select('created_at')
      .eq('user_id', userId)
      .eq('request_type', 'export')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (rateLimitError) {
      console.error('Error checking rate limit:', rateLimitError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (recentExports && recentExports.length > 0) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Only 1 data export per day is allowed.' 
      }, { status: 429 })
    }

    // Collect comprehensive user data
    const exportData: any = {
      metadata: {
        export_timestamp: new Date().toISOString(),
        legal_basis: 'GDPR Article 15 - Right of Access',
        data_controller: 'CoachMeld',
        controller_contact: 'privacy@coachmeld.com',
        format: format,
        user_id: userId
      }
    }

    // 1. User Profile Data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profileError && profile) {
      // Remove sensitive fields
      const { password_hash, internal_notes, ...safeProfile } = profile as any
      exportData.user_profile = safeProfile
    }

    // 2. Chat Messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: true })

    if (!messagesError && messages) {
      exportData.chat_history = messages
    }

    // 3. Health Metrics (if table exists)
    const { data: healthMetrics, error: healthError } = await supabase
      .from('user_health_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true })

    if (!healthError && healthMetrics) {
      exportData.health_metrics = healthMetrics
    }

    // 4. Subscription Data
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!subscriptionsError && subscriptions) {
      // Remove sensitive payment data
      exportData.subscription_data = subscriptions.map((sub: any) => {
        const { payment_method_id, stripe_customer_id, ...safeSub } = sub
        return safeSub
      })
    }

    // 5. Consent Records
    const { data: consents, error: consentsError } = await supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!consentsError && consents) {
      exportData.consent_records = consents
    }

    // 6. GDPR Request History
    const { data: gdprRequests, error: gdprRequestsError } = await supabase
      .from('gdpr_data_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!gdprRequestsError && gdprRequests) {
      exportData.gdpr_request_history = gdprRequests
    }

    // 7. Data Processing Information (GDPR Article 15 requirements)
    const { data: processingRecords, error: processingError } = await supabase
      .from('data_processing_records')
      .select('*')
      .eq('is_active', true)

    if (!processingError && processingRecords) {
      exportData.data_processing_info = {
        categories_of_data: [
          'Personal identifiers (email, name)',
          'Health and fitness data',
          'Communication records',
          'Usage analytics',
          'Technical data (IP address, device info)'
        ],
        processing_purposes: processingRecords.map((record: any) => ({
          purpose: record.purpose,
          legal_basis: record.lawful_basis,
          data_categories: record.data_categories
        })),
        recipients: [
          'Internal staff and administrators',
          'AI service providers (Google Gemini for embeddings)',
          'Payment processors (Stripe)',
          'Hosting providers (Supabase)'
        ],
        retention_period: '3 years after account closure',
        rights_information: {
          rectification: 'Contact support@coachmeld.com to correct your data',
          erasure: 'Use the delete account feature in your profile settings',
          portability: 'This export fulfills your data portability rights',
          restriction: 'Contact support@coachmeld.com to restrict processing',
          objection: 'You can object to processing via your privacy settings'
        }
      }
    }

    // Record this export request
    const { error: exportRecordError } = await supabase
      .from('gdpr_data_requests')
      .insert({
        user_id: userId,
        request_type: 'export',
        status: 'completed',
        request_details: { format: format },
        completed_at: new Date().toISOString()
      })

    if (exportRecordError) {
      console.error('Error recording export request:', exportRecordError)
      // Don't fail the export for this
    }

    // Log the action
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: 'export_user_data',
        p_resource_type: 'user_data',
        p_resource_id: userId,
        p_changes: { format: format, export_timestamp: exportData.metadata.export_timestamp },
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging export audit trail:', auditError)
    }

    // Handle different formats
    if (format === 'csv') {
      // Convert key data to CSV format
      const csvData = convertToCSV(exportData)
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user-data-${userId}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // Return JSON format
      return NextResponse.json({
        ...exportData,
        generated_at: new Date().toISOString()
      })
    }
  } catch (error: any) {
    console.error('Unexpected error in data export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to convert export data to CSV format
function convertToCSV(exportData: any): string {
  const lines: string[] = []
  
  // Header
  lines.push('Category,Field,Value,Timestamp')
  
  // Profile data
  if (exportData.user_profile) {
    Object.entries(exportData.user_profile).forEach(([key, value]) => {
      lines.push(`Profile,${key},"${value}",${exportData.user_profile.created_at || ''}`)
    })
  }
  
  // Messages
  if (exportData.chat_history) {
    exportData.chat_history.forEach((msg: any) => {
      lines.push(`Message,content,"${msg.content}",${msg.sent_at}`)
      lines.push(`Message,coach,"${msg.coach_id}",${msg.sent_at}`)
    })
  }
  
  // Health metrics
  if (exportData.health_metrics) {
    exportData.health_metrics.forEach((metric: any) => {
      Object.entries(metric).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'user_id') {
          lines.push(`Health,${key},"${value}",${metric.recorded_at || metric.created_at}`)
        }
      })
    })
  }
  
  // Consent records
  if (exportData.consent_records) {
    exportData.consent_records.forEach((consent: any) => {
      lines.push(`Consent,${consent.consent_type},"${consent.consent_given}",${consent.created_at}`)
    })
  }
  
  return lines.join('\n')
}