import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/services/embeddings/gemini'
import { chunkText, extractMetadata } from '@/services/rag/chunking'
import { createCoachDocumentAccess } from '@/lib/coach-document-access'
import { CoachId, AccessTier } from '@/lib/coach-mapping'
import { logger } from '@coachmeld/shared-utils'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const sourceType = formData.get('sourceType') as string || 'document'
    const coachAccessJson = formData.get('coachAccess') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Parse coach access configuration
    let coachAccess: Array<{ coachId: string; accessTier: string }> = []
    try {
      if (coachAccessJson) {
        coachAccess = JSON.parse(coachAccessJson)
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid coach access configuration' }, { status: 400 })
    }

    if (!coachAccess || coachAccess.length === 0) {
      return NextResponse.json({ error: 'At least one coach must be selected' }, { status: 400 })
    }

    // Read file content
    const content = await file.text()
    const fileBuffer = await file.arrayBuffer()
    const fileHash = crypto.createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex')
    
    // Create service client for admin operations
    const serviceClient = await createServiceClient()

    // Check if document already exists
    const { data: existingSource } = await serviceClient
      .from('document_sources')
      .select('id, title, created_at, metadata')
      .eq('file_hash', fileHash)
      .single()

    if (existingSource) {
      // Get active chunk count for existing document
      const { count: activeChunkCount } = await serviceClient
        .from('coach_documents')
        .select('id', { count: 'exact', head: true })
        .eq('source_id', existingSource.id)
        .eq('is_active', true)
      
      // Only consider it a duplicate if there are active chunks
      if (activeChunkCount && activeChunkCount > 0) {
        return NextResponse.json({ 
          success: false,
          isDuplicate: true,
          message: `This file has already been uploaded as "${existingSource.title}"`,
          existingDocument: {
            id: existingSource.id,
            title: existingSource.title,
            uploadedAt: existingSource.created_at,
            chunkCount: activeChunkCount
          }
        }, { status: 409 })
      }
      // If no active chunks, allow re-upload
    }

    // Extract metadata from content
    const contentMetadata = extractMetadata(content)

    // Create document source
    const { data: source, error: sourceError } = await serviceClient
      .from('document_sources')
      .insert({
        title: file.name,
        source_type: sourceType,
        file_name: file.name,
        file_hash: fileHash,
        content: content,
        metadata: {
          ...contentMetadata,
          originalName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size
        }
      })
      .select()
      .single()

    if (sourceError) {
      throw new Error(sourceError.message)
    }

    // Chunk the content
    const chunks = chunkText(content)
    const totalChunks = chunks.length
    
    // Generate embeddings and store documents for each chunk
    const documents = []
    const errors = []
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i]
        const embedding = await generateEmbedding(chunk)
        
        // Create title from source name and chunk index
        const chunkTitle = totalChunks > 1 
          ? `${file.name} - Part ${i + 1}/${totalChunks}`
          : file.name
        
        documents.push({
          source_id: source.id,
          title: chunkTitle,
          content: chunk,
          chunk_index: i,
          total_chunks: totalChunks,
          embedding,
          metadata: {
            chunk_size: chunk.length,
            position: {
              start: i * (1000 - 200), // chunkSize - overlap
              index: i
            }
          },
          version: 1,
          is_active: true
        })
      } catch (error: any) {
        errors.push({ chunk: i, error: error.message })
      }
    }

    // Store documents in batch
    if (documents.length > 0) {
      const { data: insertedDocs, error: docError } = await serviceClient
        .from('coach_documents')
        .insert(documents)
        .select('id')

      if (docError) {
        // Update source status
        await serviceClient
          .from('document_sources')
          .update({ 
            process_status: 'failed',
            error_message: docError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', source.id)
        throw new Error(docError.message)
      }
      
      // Create coach document access records based on provided configuration
      if (insertedDocs && insertedDocs.length > 0) {
        const docIds = insertedDocs.map(doc => doc.id)
        const coachIds = coachAccess.map(access => access.coachId as CoachId)
        
        // Create access for each document-coach combination with specified tiers
        for (const access of coachAccess) {
          const result = await createCoachDocumentAccess(
            docIds,
            [access.coachId as CoachId],
            access.accessTier as AccessTier
          )
          
          if (!result.success) {
            console.error(`Failed to create coach access for ${access.coachId}:`, result.error)
            // Don't fail the whole process, but log the error
          }
        }
        
        logger.info(`Created coach access for ${docIds.length} chunks with ${coachAccess.length} coaches`)
      }
    }

    // Update source metadata with processing info
    const processingInfo = {
      processStatus: errors.length > 0 ? 'partial' : 'completed',
      processedAt: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
      chunksCreated: documents.length,
      totalChunks: chunks.length
    }
    
    await serviceClient
      .from('document_sources')
      .update({ 
        metadata: {
          ...source.metadata,
          ...processingInfo
        }
      })
      .eq('id', source.id)

    return NextResponse.json({ 
      success: true, 
      source: {
        id: source.id,
        name: source.source_name,
        chunks_created: documents.length,
        total_chunks: totalChunks,
        errors: errors.length > 0 ? errors : undefined
      }
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    )
  }
}