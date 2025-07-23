import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/services/embeddings/gemini'
import { SearchResult } from '@/types/coachmeld'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    // Create service client for vector search
    const serviceClient = await createServiceClient()

    // Perform vector similarity search using CoachMeld's schema
    const { data, error } = await serviceClient.rpc('search_coach_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit
    })

    if (error) {
      throw new Error(error.message)
    }

    // Format results to match the expected interface
    const results: SearchResult[] = data.map((item: any) => ({
      id: item.id,
      document_id: item.source_id,
      content: item.content,
      similarity: item.similarity,
      metadata: item.metadata,
      chunk_index: item.chunk_index,
      document_title: item.title,
      source_name: item.source_name
    }))

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}