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
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // Search for user by email
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('email', email.toLowerCase())
      .limit(1)

    if (error) {
      console.error('Error searching for user:', error)
      return NextResponse.json({ error: 'Failed to search for user' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ user: null, message: 'User not found' }, { status: 404 })
    }

    const foundUser = users[0]
    return NextResponse.json({
      user: {
        id: foundUser.id,
        email: foundUser.email,
        full_name: foundUser.raw_user_meta_data?.full_name || null
      }
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}