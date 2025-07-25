import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Coaches } from '@/types/coachmeld'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: coach, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching coach:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ coach })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.coach_type) {
      return NextResponse.json({ error: 'Name and coach type are required' }, { status: 400 })
    }

    // Prepare update data (excluding system fields)
    const updateData: Partial<Coaches> = {
      name: body.name,
      description: body.description || null,
      coach_type: body.coach_type,
      is_free: body.is_free ?? false,
      monthly_price: body.monthly_price || 0,
      color_theme: body.color_theme || { primary: '#0084ff', secondary: '#44bec7' },
      icon_name: body.icon_name || 'chatbubbles',
      features: body.features || [],
      knowledge_base_enabled: body.knowledge_base_enabled ?? false,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order || 999,
    }

    // Update the coach
    const { data: coach, error } = await supabase
      .from('coaches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating coach:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ coach })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Soft delete: set is_active to false
    const { data: coach, error } = await supabase
      .from('coaches')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting coach:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Coach deactivated successfully', coach })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}