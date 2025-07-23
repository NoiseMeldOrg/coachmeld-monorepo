import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createCoachDocumentAccess } from '@/lib/coach-document-access'
import { getAllCoaches } from '@/lib/coach-mapping'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    
    // Always migrate all orphaned documents
    return await migrateAllOrphaned(serviceClient)
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}

async function migrateAllOrphaned(serviceClient: any) {
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
  const accessedIds = new Set(docsWithAccess?.map((d: any) => d.document_id) || [])
  const orphanedDocs = allDocs?.filter((d: any) => !accessedIds.has(d.id)) || []

  if (!orphanedDocs || orphanedDocs.length === 0) {
    return NextResponse.json({ migratedCount: 0 })
  }

  // Get all coach IDs
  const allCoaches = getAllCoaches()
  const coachIds = allCoaches.map(coach => coach.id)
  
  // Migrate all orphaned documents to all coaches at pro tier
  const docIds = orphanedDocs.map((d: any) => d.id)
  const result = await createCoachDocumentAccess(
    docIds,
    coachIds,
    'pro'
  )
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create coach access')
  }

  return NextResponse.json({ 
    migratedCount: orphanedDocs.length,
    assignedToCoaches: coachIds.length
  })
}