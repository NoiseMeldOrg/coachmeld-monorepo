import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // First check if user is authenticated
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client to bypass RLS for admin statistics
    const supabase = await createServiceClient()
    
    // Always use the fallback approach since we don't have the RPC function
    const tableSizesError = true // Force fallback
    
    if (tableSizesError) {
      // Fallback: manually count rows for important tables
      const tables = [
        'profiles',
        'messages', 
        'coaches',
        'coach_documents',
        'document_sources',
        'subscriptions',
        'user_payment_methods',
        'analytics_events',
        'account_deletion_requests'
      ]
      
      const tableCounts = await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          return {
            table_name: table,
            row_count: count || 0,
            error: error?.message
          }
        })
      )
      
      // Get storage usage for key tables with large data
      const storageStats = {
        coach_documents: {
          total_rows: 0,
          avg_chunk_size: 0,
          total_chunks: 0
        },
        document_sources: {
          total_rows: 0,
          total_documents: 0,
          avg_document_size: 0
        }
      }
      
      // Count coach documents
      const { count: coachDocsCount } = await supabase
        .from('coach_documents')
        .select('*', { count: 'exact', head: true })
      
      storageStats.coach_documents.total_rows = coachDocsCount || 0
      
      // Count document sources
      const { count: docSourcesCount } = await supabase
        .from('document_sources')
        .select('*', { count: 'exact', head: true })
      
      storageStats.document_sources.total_rows = docSourcesCount || 0
      
      // Get recent activity stats
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      // Messages activity
      const { count: messages24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString())
      
      const { count: messages7d } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7d.toISOString())
      
      const { count: messages30d } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30d.toISOString())
      
      // New users
      const { count: users24h } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString())
      
      const { count: users7d } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7d.toISOString())
      
      const { count: users30d } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30d.toISOString())
      
      // Documents added
      const { count: docs24h } = await supabase
        .from('document_sources')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString())
      
      const { count: docs7d } = await supabase
        .from('document_sources')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7d.toISOString())
      
      const { count: docs30d } = await supabase
        .from('document_sources')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30d.toISOString())
      
      // Analytics events
      const { count: events24h } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString())
      
      const { count: events7d } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7d.toISOString())
      
      const { count: events30d } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30d.toISOString())
      
      // Subscription stats
      const { data: _activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('subscription_status', { count: 'exact', head: false })
        .eq('subscription_status', 'active')
      
      const { count: activeSubsCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active')
      
      const { count: cancelledSubsCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'cancelled')
      
      // GDPR requests
      const { count: pendingGdprCount } = await supabase
        .from('account_deletion_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      const { count: completedGdprCount } = await supabase
        .from('account_deletion_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
      
      const response = {
        success: true,
        tableSizes: tableCounts,
        storageStats,
        activityStats: {
          messages: {
            last24h: messages24h || 0,
            last7d: messages7d || 0,
            last30d: messages30d || 0
          },
          newUsers: {
            last24h: users24h || 0,
            last7d: users7d || 0,
            last30d: users30d || 0
          },
          documentsAdded: {
            last24h: docs24h || 0,
            last7d: docs7d || 0,
            last30d: docs30d || 0
          },
          analyticsEvents: {
            last24h: events24h || 0,
            last7d: events7d || 0,
            last30d: events30d || 0
          }
        },
        subscriptionStats: {
          active: activeSubsCount || 0,
          cancelled: cancelledSubsCount || 0,
          total: (activeSubsCount || 0) + (cancelledSubsCount || 0)
        },
        gdprStats: {
          pending: pendingGdprCount || 0,
          completed: completedGdprCount || 0
        }
      }
      
      return NextResponse.json(response)
    }
    
    // This should never be reached since we force the fallback
    return NextResponse.json({
      success: false,
      error: 'Unexpected code path'
    })
    
  } catch (error: any) {
    console.error('Database stats error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch database statistics' },
      { status: 500 }
    )
  }
}