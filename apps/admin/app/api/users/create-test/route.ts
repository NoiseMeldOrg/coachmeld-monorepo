import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

interface TestUser {
  email: string
  password: string
  tier: 'free' | 'pro' | 'enterprise'
  metadata?: Record<string, any>
}

// Default test users with different subscription tiers
const DEFAULT_TEST_USERS: TestUser[] = [
  {
    email: 'test-free@example.com',
    password: 'TestPassword123!',
    tier: 'free',
    metadata: {
      name: 'Free Test User',
      testAccount: true,
    }
  },
  {
    email: 'test-pro@example.com',
    password: 'TestPassword123!',
    tier: 'pro',
    metadata: {
      name: 'Pro Test User',
      testAccount: true,
    }
  },
  {
    email: 'test-enterprise@example.com',
    password: 'TestPassword123!',
    tier: 'enterprise',
    metadata: {
      name: 'Enterprise Test User',
      testAccount: true,
    }
  }
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Check if user is admin
    // You might want to add an admin check here based on your user roles

    const body = await request.json()
    const { users = DEFAULT_TEST_USERS, useDefaults = true } = body

    // Use default users if specified or no custom users provided
    const testUsers = useDefaults || users.length === 0 ? DEFAULT_TEST_USERS : users

    // Create service client for admin operations
    const serviceClient = await createServiceClient()

    const results = []

    for (const testUser of testUsers) {
      try {
        // Create auth user
        const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true, // Auto-confirm email for test users
          user_metadata: testUser.metadata || {},
        })

        if (authError) {
          throw authError
        }

        // Create user profile with subscription tier
        const { data: profile, error: profileError } = await serviceClient
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: testUser.email,
            subscription_tier: testUser.tier,
            subscription_status: 'active',
            metadata: {
              ...testUser.metadata,
              created_by: 'test-user-api',
              created_at: new Date().toISOString(),
            }
          })
          .select()
          .single()

        if (profileError) {
          // If profile creation fails, try to clean up the auth user
          await serviceClient.auth.admin.deleteUser(authData.user.id)
          throw profileError
        }

        // Set subscription limits based on tier
        const limits = {
          free: {
            max_documents: 10,
            max_queries_per_day: 50,
            max_storage_mb: 100,
          },
          pro: {
            max_documents: 100,
            max_queries_per_day: 500,
            max_storage_mb: 1000,
          },
          enterprise: {
            max_documents: -1, // unlimited
            max_queries_per_day: -1, // unlimited
            max_storage_mb: -1, // unlimited
          }
        }

        // Create subscription record
        const { error: subError } = await serviceClient
          .from('user_subscriptions')
          .insert({
            user_id: authData.user.id,
            tier: testUser.tier,
            status: 'active',
            limits: limits[testUser.tier as keyof typeof limits],
            trial_ends_at: testUser.tier === 'free' 
              ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 day trial for free
              : null,
            metadata: {
              test_account: true,
            }
          })

        if (subError) {
          console.error('Subscription creation error:', subError)
          // Non-critical error, continue
        }

        results.push({
          email: testUser.email,
          userId: authData.user.id,
          tier: testUser.tier,
          success: true,
          message: 'Test user created successfully',
        })
      } catch (error: any) {
        results.push({
          email: testUser.email,
          success: false,
          error: error.message || 'Failed to create test user',
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: successful > 0,
      message: `Created ${successful} test users, ${failed} failed`,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
      }
    })
  } catch (error: any) {
    console.error('Create test users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create test users' },
      { status: 500 }
    )
  }
}

// GET endpoint to list test users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service client
    const serviceClient = await createServiceClient()

    // Get all test users
    const { data: testUsers, error } = await serviceClient
      .from('user_profiles')
      .select(`
        *,
        user_subscriptions (
          tier,
          status,
          limits,
          trial_ends_at
        )
      `)
      .eq('metadata->>testAccount', 'true')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      users: testUsers || [],
      count: testUsers?.length || 0,
    })
  } catch (error: any) {
    console.error('List test users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list test users' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clean up test users
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, deleteAll = false } = await request.json()

    if (!userId && !deleteAll) {
      return NextResponse.json(
        { error: 'Either userId or deleteAll flag is required' },
        { status: 400 }
      )
    }

    // Create service client for admin operations
    const serviceClient = await createServiceClient()

    if (deleteAll) {
      // Get all test users
      const { data: testUsers, error: listError } = await serviceClient
        .from('user_profiles')
        .select('id')
        .eq('metadata->>testAccount', 'true')

      if (listError) {
        throw listError
      }

      const results = []
      for (const testUser of testUsers || []) {
        try {
          // Delete from auth
          const { error } = await serviceClient.auth.admin.deleteUser(testUser.id)
          if (error) throw error

          results.push({ userId: testUser.id, success: true })
        } catch (error: any) {
          results.push({ 
            userId: testUser.id, 
            success: false, 
            error: error.message 
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${results.filter(r => r.success).length} test users`,
        results,
      })
    } else {
      // Delete single user
      const { error } = await serviceClient.auth.admin.deleteUser(userId)
      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Test user deleted successfully',
      })
    }
  } catch (error: any) {
    console.error('Delete test users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete test users' },
      { status: 500 }
    )
  }
}