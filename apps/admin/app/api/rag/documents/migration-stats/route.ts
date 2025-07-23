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

    // Get total document count
    const { count: totalDocuments } = await serviceClient
      .from('coach_documents')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get all active documents
    const { data: allDocs, error: docsError } = await serviceClient
      .from('coach_documents')
      .select('id, source_id')
      .eq('is_active', true)
    
    if (docsError) throw docsError
    
    // Get documents with coach access
    const { data: docsWithAccess, error: accessError } = await serviceClient
      .from('coach_document_access')
      .select('document_id')
    
    if (accessError) throw accessError
    
    // Find orphaned documents
    const accessedIds = new Set(docsWithAccess?.map(d => d.document_id) || [])
    const orphanedDocs = allDocs?.filter(d => !accessedIds.has(d.id)) || []

    return NextResponse.json({
      totalDocuments: totalDocuments || 0,
      orphanedDocuments: orphanedDocs?.length || 0,
      documentsWithAccess: (totalDocuments || 0) - (orphanedDocs?.length || 0)
    })
  } catch (error: any) {
    console.error('Error fetching migration stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch migration stats' },
      { status: 500 }
    )
  }
}