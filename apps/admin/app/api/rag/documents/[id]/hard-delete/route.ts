import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sourceId = params.id
    console.log('Hard delete requested for source:', sourceId)

    // Create service client for admin operations
    const serviceClient = await createServiceClient()

    // First, get all document IDs for this source
    const { data: documents, error: fetchError } = await serviceClient
      .from('coach_documents')
      .select('id')
      .eq('source_id', sourceId)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    const documentIds = documents?.map(d => d.id) || []
    console.log(`Found ${documentIds.length} documents to delete`)

    // Delete coach access records first (due to foreign key constraints)
    if (documentIds.length > 0) {
      const { error: accessError } = await serviceClient
        .from('coach_document_access')
        .delete()
        .in('document_id', documentIds)

      if (accessError) {
        console.error('Failed to delete coach access records:', accessError)
        throw new Error(`Failed to delete access records: ${accessError.message}`)
      }
      console.log('Deleted coach access records')
    }

    // Delete all documents/chunks
    const { error: docError } = await serviceClient
      .from('coach_documents')
      .delete()
      .eq('source_id', sourceId)

    if (docError) {
      console.error('Failed to delete documents:', docError)
      throw new Error(`Failed to delete documents: ${docError.message}`)
    }
    console.log('Deleted documents')

    // Finally, delete the source
    const { error: sourceError } = await serviceClient
      .from('document_sources')
      .delete()
      .eq('id', sourceId)

    if (sourceError) {
      console.error('Failed to delete source:', sourceError)
      throw new Error(`Failed to delete source: ${sourceError.message}`)
    }
    console.log('Deleted source')

    return NextResponse.json({
      success: true,
      message: 'Document and all associated data permanently deleted',
      deletedItems: {
        documents: documentIds.length,
        source: sourceId
      }
    })
  } catch (error: any) {
    console.error('Hard delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to permanently delete document' },
      { status: 500 }
    )
  }
}