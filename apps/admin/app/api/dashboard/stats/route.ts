import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Helper function to safely query knowledge entries
    const getKnowledgeEntriesCount = async () => {
      try {
        const result = await serviceClient
          .from('knowledge_entries')
          .select('id', { count: 'exact', head: true })
        return result
      } catch (error) {
        return { count: 0 }
      }
    }

    // Fetch various statistics in parallel
    const [
      documentSourcesCount,
      activeDocumentsCount,
      usersCount,
      knowledgeEntriesCount,
      youtubeTranscriptsCount,
      totalEmbeddingsCount
    ] = await Promise.all([
      // Total document sources
      serviceClient
        .from('document_sources')
        .select('id', { count: 'exact', head: true }),
      
      // Active documents (chunks)
      serviceClient
        .from('coach_documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      
      // Total users
      serviceClient.auth.admin.listUsers(),
      
      // Knowledge entries (if table exists)
      getKnowledgeEntriesCount(),
      
      // YouTube transcripts (documents with videoId in metadata)
      serviceClient
        .from('document_sources')
        .select('id', { count: 'exact', head: true })
        .not('metadata->videoId', 'is', null),
      
      // Total embeddings (active documents with embeddings)
      serviceClient
        .from('coach_documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('embedding', 'is', null)
    ])

    // Get recent activity (last 5 document sources)
    const { data: recentDocuments } = await serviceClient
      .from('document_sources')
      .select('id, title, source_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent YouTube transcripts
    const { data: recentTranscripts } = await serviceClient
      .from('document_sources')
      .select(`
        id,
        title,
        created_at,
        metadata
      `)
      .not('metadata->videoId', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    // For each transcript, get chunk count
    const transcriptsWithChunks = await Promise.all(
      (recentTranscripts || []).map(async (transcript) => {
        const { count } = await serviceClient
          .from('coach_documents')
          .select('id', { count: 'exact', head: true })
          .eq('source_id', transcript.id)
          .eq('is_active', true)
        
        return {
          ...transcript,
          chunk_count: count || 0
        }
      })
    )

    const stats = {
      totalDocuments: documentSourcesCount.count || 0,
      activeUsers: usersCount.data?.users?.length || 0,
      knowledgeEntries: knowledgeEntriesCount.count || 0,
      youtubeTranscripts: youtubeTranscriptsCount.count || 0,
      vectorEmbeddings: totalEmbeddingsCount.count || 0,
      activeDocumentChunks: activeDocumentsCount.count || 0,
      systemHealth: 'Good' // Could implement actual health checks
    }

    return NextResponse.json({
      success: true,
      stats,
      recentActivity: recentDocuments || [],
      recentTranscripts: transcriptsWithChunks
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}