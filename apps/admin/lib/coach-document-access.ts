import { createServiceClient } from '@/lib/supabase/server'
import { CoachId, AccessTier } from './coach-mapping'

export interface CoachDocumentAccess {
  document_id: string
  coach_id: string
  access_tier?: AccessTier
  created_at?: string
}

/**
 * Create coach document access records for a document
 */
export async function createCoachDocumentAccess(
  documentIds: string[],
  coachIds: CoachId[],
  accessTier: AccessTier = 'pro'
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceClient = await createServiceClient()
    
    // Create access records for each document-coach combination
    const accessRecords = documentIds.flatMap(documentId =>
      coachIds.map(coachId => ({
        document_id: documentId,
        coach_id: coachId,
        access_tier: accessTier,
      }))
    )
    
    if (accessRecords.length === 0) {
      return { success: true }
    }
    
    const { error } = await serviceClient
      .from('coach_document_access')
      .insert(accessRecords)
      .select()
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error('Error creating coach document access:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update coach document access for existing documents
 */
export async function updateCoachDocumentAccess(
  documentId: string,
  coachAccess: Array<{ coachId: CoachId; accessTier: AccessTier }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceClient = await createServiceClient()
    
    // Delete existing access records
    const { error: deleteError } = await serviceClient
      .from('coach_document_access')
      .delete()
      .eq('document_id', documentId)
    
    if (deleteError) throw deleteError
    
    // Insert new access records
    if (coachAccess.length > 0) {
      const accessRecords = coachAccess.map(access => ({
        document_id: documentId,
        coach_id: access.coachId,
        access_tier: access.accessTier,
      }))
      
      const { error: insertError } = await serviceClient
        .from('coach_document_access')
        .insert(accessRecords)
      
      if (insertError) throw insertError
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error updating coach document access:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get coach access for a document
 */
export async function getDocumentCoachAccess(
  documentId: string
): Promise<{ data: CoachDocumentAccess[]; error?: string }> {
  try {
    const serviceClient = await createServiceClient()
    
    const { data, error } = await serviceClient
      .from('coach_document_access')
      .select('*')
      .eq('document_id', documentId)
    
    if (error) throw error
    
    return { data: data || [] }
  } catch (error: any) {
    console.error('Error getting document coach access:', error)
    return { data: [], error: error.message }
  }
}

/**
 * Get coach access for multiple documents (for bulk operations)
 */
export async function getDocumentsCoachAccess(
  documentIds: string[]
): Promise<{ data: Record<string, CoachDocumentAccess[]>; error?: string }> {
  try {
    const serviceClient = await createServiceClient()
    
    const { data, error } = await serviceClient
      .from('coach_document_access')
      .select('*')
      .in('document_id', documentIds)
    
    if (error) throw error
    
    // Group by document_id
    const grouped = (data || []).reduce((acc, access) => {
      if (!acc[access.document_id]) {
        acc[access.document_id] = []
      }
      acc[access.document_id].push(access)
      return acc
    }, {} as Record<string, CoachDocumentAccess[]>)
    
    return { data: grouped }
  } catch (error: any) {
    console.error('Error getting documents coach access:', error)
    return { data: {}, error: error.message }
  }
}

