import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Get users from auth.users
    const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (usersError) {
      throw usersError
    }

    // Transform user data
    const transformedUsers = users.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      role: user.role,
      updated_at: user.updated_at
    }))

    // Get user statistics
    const stats = {
      total: users.users.length,
      confirmed: users.users.filter(u => u.email_confirmed_at).length,
      unconfirmed: users.users.filter(u => !u.email_confirmed_at).length,
      recentlyActive: users.users.filter(u => {
        if (!u.last_sign_in_at) return false
        const lastSignIn = new Date(u.last_sign_in_at)
        const daysSinceSignIn = (Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceSignIn <= 7
      }).length
    }

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      stats
    })
  } catch (error: any) {
    console.error('List users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list users' },
      { status: 500 }
    )
  }
}