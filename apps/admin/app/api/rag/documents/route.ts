import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DocumentSources, CoachDocuments, DocumentGroup } from '@/types/coachmeld'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const dietType = searchParams.get('dietType')
    const search = searchParams.get('search')
    
    // Calculate offset
    const offset = (page - 1) * limit

    // Create service client for database operations
    const serviceClient = await createServiceClient()

    // First get document sources with pagination
    let sourcesQuery = serviceClient
      .from('document_sources')
      .select('*', { count: 'exact' })

    // Apply search filter on title or filename
    if (search) {
      sourcesQuery = sourcesQuery.or(`title.ilike.%${search}%,filename.ilike.%${search}%`)
    }

    // Apply pagination and ordering
    sourcesQuery = sourcesQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: sources, error: sourcesError, count } = await sourcesQuery

    if (sourcesError) {
      throw new Error(sourcesError.message)
    }

    // Calculate total pages
    const totalPages = Math.ceil((count || 0) / limit)

    // Get all documents for these sources
    const sourceIds = sources?.map(s => s.id) || []
    const { data: documents } = await serviceClient
      .from('coach_documents')
      .select('*')
      .in('source_id', sourceIds)
      .eq('is_active', true)
      .order('chunk_index', { ascending: true })

    // Group documents by source
    const documentGroups: DocumentGroup[] = sources?.map(source => {
      const sourceDocs = documents?.filter(doc => doc.source_id === source.id) || []
      return {
        source,
        documents: sourceDocs,
        totalChunks: sourceDocs.length
      }
    }) || []

    return NextResponse.json({
      success: true,
      documentGroups,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      }
    })
  } catch (error: any) {
    console.error('Documents list error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
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

    const { sourceId } = await request.json()

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 })
    }

    // Create service client for admin operations
    const serviceClient = await createServiceClient()

    // Soft delete all documents for this source
    const { error: docError } = await serviceClient
      .from('coach_documents')
      .update({ is_active: false })
      .eq('source_id', sourceId)

    if (docError) {
      throw new Error(docError.message)
    }

    // Note: document_sources table doesn't have is_active column
    // Soft delete is only done on coach_documents
    // The source remains in the database but with no active documents

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error: any) {
    console.error('Document delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    )
  }
}