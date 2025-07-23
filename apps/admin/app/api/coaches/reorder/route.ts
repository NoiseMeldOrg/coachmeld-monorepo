import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { coaches } = body

    if (!Array.isArray(coaches)) {
      return NextResponse.json({ error: 'Invalid coaches array' }, { status: 400 })
    }

    // Update sort_order for each coach
    const updates = coaches.map((coach, index) => 
      supabase
        .from('coaches')
        .update({ sort_order: index + 1 })
        .eq('id', coach.id)
    )

    const results = await Promise.all(updates)
    
    // Check if any updates failed
    const hasError = results.some(result => result.error)
    if (hasError) {
      console.error('Error updating sort orders:', results)
      return NextResponse.json({ error: 'Failed to update sort orders' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Sort orders updated successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}