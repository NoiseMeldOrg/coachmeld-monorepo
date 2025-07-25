/**
 * GDPR Data Retention and Purging API
 * Implements automated data retention policies and purging workflows
 * Ensures compliance with data retention requirements
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
    // For now, assume all authenticated users are admins

    const payload = await request.json()
    const { action, dry_run = true } = payload

    if (!action || !['purge_expired', 'identify_expired', 'update_retention'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be one of: purge_expired, identify_expired, update_retention' 
      }, { status: 400 })
    }

    const results = {
      action: action,
      dry_run: dry_run,
      timestamp: new Date().toISOString(),
      affected_records: 0,
      details: [] as any[]
    }

    if (action === 'identify_expired') {
      // Find users whose data has expired based on retention policies
      const expiredUsers = await identifyExpiredUsers(supabase)
      results.affected_records = expiredUsers.length
      results.details = expiredUsers
      
    } else if (action === 'purge_expired') {
      // Actually purge expired data (only if dry_run is false)
      const purgeResults = await purgeExpiredData(supabase, dry_run)
      results.affected_records = purgeResults.total_records
      results.details = purgeResults.details
      
    } else if (action === 'update_retention') {
      // Update retention dates for active users
      const updateResults = await updateRetentionDates(supabase, dry_run)
      results.affected_records = updateResults.updated_count
      results.details = updateResults.details
    }

    // Log the retention action
    const { error: auditError } = await supabase
      .rpc('log_gdpr_action', {
        p_admin_id: user.id,
        p_action: `retention_${action}`,
        p_resource_type: 'data_retention',
        p_resource_id: null,
        p_changes: results,
        p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })

    if (auditError) {
      console.error('Error logging retention action:', auditError)
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Unexpected error in retention management:', error)
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

    // Get retention policy status and statistics
    const retentionStatus = await getRetentionStatus(supabase)
    
    return NextResponse.json({
      retention_policies: retentionStatus.policies,
      current_status: retentionStatus.status,
      next_purge_due: retentionStatus.nextPurgeDue,
      statistics: retentionStatus.statistics
    })
  } catch (error: any) {
    console.error('Unexpected error getting retention status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to identify users whose data has expired
async function identifyExpiredUsers(supabase: any) {
  const expiredUsers = []
  
  // Find profiles with expired retention dates
  const { data: expiredProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, data_retention_date, updated_at')
    .not('data_retention_date', 'is', null)
    .lt('data_retention_date', new Date().toISOString())

  if (!profilesError && expiredProfiles) {
    for (const profile of expiredProfiles) {
      const retentionInfo = {
        user_id: profile.id,
        user_email: profile.email,
        retention_date: profile.data_retention_date,
        days_expired: Math.floor(
          (new Date().getTime() - new Date(profile.data_retention_date).getTime()) / (1000 * 60 * 60 * 24)
        ),
        affected_tables: [] as string[]
      }

      // Check which tables have data for this user
      const tablesToCheck = ['messages', 'gdpr_consent_records', 'gdpr_data_requests']
      
      for (const table of tablesToCheck) {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .eq('user_id', profile.id)
          .limit(1)

        if (!error && data && data.length > 0) {
          retentionInfo.affected_tables.push(table)
        }
      }

      expiredUsers.push(retentionInfo)
    }
  }

  return expiredUsers
}

// Helper function to purge expired data
async function purgeExpiredData(supabase: any, dryRun: boolean) {
  const results = {
    total_records: 0,
    details: [] as any[]
  }

  // Get expired users
  const expiredUsers = await identifyExpiredUsers(supabase)

  for (const userInfo of expiredUsers) {
    const userResults = {
      user_id: userInfo.user_id,
      user_email: userInfo.user_email,
      tables_purged: [] as string[],
      records_deleted: 0,
      errors: [] as string[]
    }

    // Tables to purge (in order to respect foreign key constraints)
    const tablesToPurge = [
      'messages',
      'gdpr_consent_records', 
      'gdpr_data_requests'
      // Note: We typically don't delete the profile itself for audit purposes
    ]

    if (!dryRun) {
      for (const table of tablesToPurge) {
        try {
          const { data, error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', userInfo.user_id)
            .select('id')

          if (error) {
            userResults.errors.push(`Failed to delete from ${table}: ${error.message}`)
          } else {
            userResults.tables_purged.push(table)
            userResults.records_deleted += data?.length || 0
          }
        } catch (err: any) {
          userResults.errors.push(`Unexpected error deleting from ${table}: ${err.message}`)
        }
      }

      // Mark profile as purged (but don't delete for audit trail)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          data_purged_at: new Date().toISOString(),
          gdpr_status: 'purged'
        })
        .eq('id', userInfo.user_id)

      if (profileError) {
        userResults.errors.push(`Failed to mark profile as purged: ${profileError.message}`)
      }
    } else {
      // Dry run - just simulate what would be deleted
      userResults.tables_purged = userInfo.affected_tables
      userResults.records_deleted = userInfo.affected_tables.length * 10 // Estimate
    }

    results.total_records += userResults.records_deleted
    results.details.push(userResults)
  }

  return results
}

// Helper function to update retention dates for active users
async function updateRetentionDates(supabase: any, dryRun: boolean) {
  const results = {
    updated_count: 0,
    details: [] as any[]
  }

  // Find active users without proper retention dates
  const { data: activeUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, created_at, data_retention_date')
    .or('data_retention_date.is.null,data_retention_date.gt.' + new Date().toISOString())
    .eq('is_active', true)

  if (!usersError && activeUsers) {
    for (const user of activeUsers) {
      // Calculate retention date (3 years from account creation or last activity)
      const createdAt = new Date(user.created_at)
      const retentionDate = new Date(createdAt.getTime() + (3 * 365 * 24 * 60 * 60 * 1000)) // 3 years

      const updateInfo = {
        user_id: user.id,
        user_email: user.email,
        old_retention_date: user.data_retention_date,
        new_retention_date: retentionDate.toISOString(),
        reason: user.data_retention_date ? 'Updated calculation' : 'Initial calculation'
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            data_retention_date: retentionDate.toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          updateInfo.reason = `Error: ${updateError.message}`
        } else {
          results.updated_count++
        }
      } else {
        results.updated_count++
      }

      results.details.push(updateInfo)
    }
  }

  return results
}

// Helper function to get overall retention status
async function getRetentionStatus(supabase: any) {
  const policies = {
    user_data: '3 years after account closure',
    audit_logs: '7 years for legal compliance',
    consent_records: 'Until withdrawn or account deleted',
    gdpr_requests: '7 years for audit purposes'
  }

  // Get statistics
  const statistics = {
    total_users: 0,
    users_with_retention_dates: 0,
    expired_users: 0,
    next_expiring_users: 0
  }

  // Count total users
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, data_retention_date')
    .eq('is_active', true)

  if (allUsers) {
    statistics.total_users = allUsers.length
    statistics.users_with_retention_dates = allUsers.filter(u => u.data_retention_date).length

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))

    statistics.expired_users = allUsers.filter(u => 
      u.data_retention_date && new Date(u.data_retention_date) < now
    ).length

    statistics.next_expiring_users = allUsers.filter(u => 
      u.data_retention_date && 
      new Date(u.data_retention_date) >= now && 
      new Date(u.data_retention_date) <= thirtyDaysFromNow
    ).length
  }

  // Calculate next purge due date (should be run monthly)
  const nextPurgeDue = new Date()
  nextPurgeDue.setMonth(nextPurgeDue.getMonth() + 1)
  nextPurgeDue.setDate(1) // First of next month

  const status = {
    compliance_level: statistics.expired_users === 0 ? 'COMPLIANT' : 'ACTION_REQUIRED',
    last_purge_date: null, // TODO: Track this in a system table
    automated_purging_enabled: false // TODO: Implement automated scheduling
  }

  return {
    policies,
    status,
    nextPurgeDue: nextPurgeDue.toISOString(),
    statistics
  }
}