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

    const searchParams = request.nextUrl.searchParams
    const dietType = searchParams.get('dietType')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const serviceClient = await createServiceClient()

    // Build query
    let query = serviceClient
      .from('knowledge_entries')
      .select('*')
      .order('updated_at', { ascending: false })

    // Apply filters
    if (dietType && dietType !== 'all') {
      query = query.or(`diet_type.eq.${dietType},diet_type.eq.shared`)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      entries: data || []
    })
  } catch (error: any) {
    console.error('Knowledge fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knowledge entries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, category, diet_type, tags } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceClient()

    // Create knowledge entry
    const { data, error } = await serviceClient
      .from('knowledge_entries')
      .insert({
        title,
        content,
        category: category || 'general',
        diet_type: diet_type || 'shared',
        tags: tags || [],
        version: 1,
        created_by: user.email,
        updated_by: user.email
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Also create initial version history
    await serviceClient
      .from('knowledge_versions')
      .insert({
        entry_id: data.id,
        version: 1,
        content,
        changed_by: user.email,
        change_summary: 'Initial creation'
      })

    return NextResponse.json({
      success: true,
      entry: data
    })
  } catch (error: any) {
    console.error('Knowledge create error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create knowledge entry' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, content, category, diet_type, tags, change_summary } = body

    if (!id || !title || !content) {
      return NextResponse.json(
        { error: 'ID, title and content are required' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceClient()

    // Get current version
    const { data: current } = await serviceClient
      .from('knowledge_entries')
      .select('version, content')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const newVersion = current.version + 1

    // Update entry
    const { data, error } = await serviceClient
      .from('knowledge_entries')
      .update({
        title,
        content,
        category,
        diet_type,
        tags,
        version: newVersion,
        updated_by: user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Create version history
    await serviceClient
      .from('knowledge_versions')
      .insert({
        entry_id: id,
        version: newVersion,
        content,
        changed_by: user.email,
        change_summary: change_summary || 'Updated content'
      })

    return NextResponse.json({
      success: true,
      entry: data
    })
  } catch (error: any) {
    console.error('Knowledge update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update knowledge entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Delete version history first
    await serviceClient
      .from('knowledge_versions')
      .delete()
      .eq('entry_id', id)

    // Delete the entry
    const { error } = await serviceClient
      .from('knowledge_entries')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Knowledge entry deleted successfully'
    })
  } catch (error: any) {
    console.error('Knowledge delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete knowledge entry' },
      { status: 500 }
    )
  }
}