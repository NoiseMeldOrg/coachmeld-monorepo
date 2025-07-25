import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processPlaylist, getVideoTranscript } from '@/services/youtube/transcript'
import { generateEmbedding } from '@/services/embeddings/gemini'
import { chunkText } from '@/services/rag/chunking'
import { normalizeYouTubeUrl } from '@/lib/url-utils'
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

    const body = await request.json()
    logger.debug('Request body:', { body: JSON.stringify(body, null, 2) })
    const { playlistId, videoId, url, videos: frontendVideos, coachAccess } = body
    
    // Validate coach access configuration
    if (!coachAccess || !Array.isArray(coachAccess) || coachAccess.length === 0) {
      return NextResponse.json({ error: 'At least one coach must be selected' }, { status: 400 })
    }
    
    // Extract playlist ID from URL if provided
    let actualPlaylistId = playlistId
    if (!actualPlaylistId && url && url.includes('playlist')) {
      const match = url.match(/[?&]list=([^&]+)/)
      if (match) {
        actualPlaylistId = match[1]
        logger.info('Extracted playlist ID from URL:', { actualPlaylistId })
      }
    }

    // Check if we need to extract video ID from URL for single video
    let actualVideoId = videoId
    if (!actualVideoId && url && !url.includes('playlist')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (match) {
        actualVideoId = match[1]
        logger.info('Extracted video ID from URL:', { actualVideoId })
      }
    }

    if (!actualPlaylistId && !actualVideoId) {
      console.error('No playlist ID or video ID found')
      return NextResponse.json({ error: 'Either playlistId or videoId is required' }, { status: 400 })
    }

    // Create service client for database operations
    const serviceClient = await createServiceClient()

    // Process single video or playlist
    let videosToProcess: any[] = []
    
    if (actualVideoId) {
      // Process single video
      logger.info('Processing single video:', { actualVideoId })
      // First check for duplicates
      const videoUrl = `https://youtube.com/watch?v=${actualVideoId}`
      const normalizedUrl = normalizeYouTubeUrl(videoUrl)
      
      if (normalizedUrl) {
        const { data: existing } = await serviceClient
          .from('document_sources')
          .select('id, title, created_at')
          .eq('source_url', normalizedUrl)
          .single()
          
        if (existing) {
          // Check if any chunks are still active
          const { count: activeChunks } = await serviceClient
            .from('coach_documents')
            .select('id', { count: 'exact', head: true })
            .eq('source_id', existing.id)
            .eq('is_active', true)
          
          if (activeChunks && activeChunks > 0) {
            return NextResponse.json({
              success: false,
              isDuplicate: true,
              existingDocument: existing,
              message: `This YouTube video has already been added as "${existing.title}"`
            }, { status: 409 })
          }
          // If no active chunks, allow re-processing
        }
      }
      
      try {
        logger.info('Fetching transcript for video:', { actualVideoId })
        const transcript = await getVideoTranscript(actualVideoId)
        logger.info('Transcript length:', { length: transcript.length })
        videosToProcess = [{
          videoId: actualVideoId,
          title: `YouTube Video ${actualVideoId}`,
          transcript,
          duration: 0,
          url: normalizedUrl || videoUrl
        }]
      } catch (error: any) {
        console.error('Transcript fetch error:', error)
        return NextResponse.json(
          { error: `Failed to get transcript: ${error.message}` },
          { status: 400 }
        )
      }
    } else {
      // Process playlist - first get metadata only
      logger.info('Processing playlist with ID:', { actualPlaylistId })
      const playlistVideos = await processPlaylist(actualPlaylistId)
      console.log(`Found ${playlistVideos.length} videos in playlist`)
      
      // Check each video for duplicates BEFORE fetching transcripts
      for (let i = 0; i < playlistVideos.length; i++) {
        const video = playlistVideos[i]
        console.log(`Checking video ${i + 1}/${playlistVideos.length}: ${video.videoId} - ${video.title}`)
        const videoUrl = normalizeYouTubeUrl(`https://youtube.com/watch?v=${video.videoId}`) || `https://youtube.com/watch?v=${video.videoId}`
        
        // Check if video already exists
        const { data: existing } = await serviceClient
          .from('document_sources')
          .select('id, title')
          .eq('source_url', videoUrl)
          .single()
        
        if (existing) {
          // Check if any chunks are still active
          const { count: activeChunks } = await serviceClient
            .from('coach_documents')
            .select('id', { count: 'exact', head: true })
            .eq('source_id', existing.id)
            .eq('is_active', true)
          
          if (activeChunks && activeChunks > 0) {
            console.log(`Video ${video.videoId} already exists as "${existing.title}" with ${activeChunks} active chunks, skipping transcript fetch`)
            videosToProcess.push({
              ...video,
              url: videoUrl,
              transcript: '',
              error: `Already exists as "${existing.title}"`,
              isDuplicate: true,
              existingTitle: existing.title
            })
          } else {
            console.log(`Video ${video.videoId} exists but has no active chunks, allowing re-processing`)
            // Fetch transcript for re-processing
            try {
              console.log(`Fetching transcript for video ${video.videoId}: ${video.title}`)
              const transcript = await getVideoTranscript(video.videoId)
              videosToProcess.push({
                ...video,
                url: videoUrl,
                transcript
              })
            } catch (error: any) {
              console.error(`Failed to fetch transcript for ${video.videoId}:`, error.message)
              videosToProcess.push({
                ...video,
                url: videoUrl,
                transcript: '',
                error: error.message
              })
            }
          }
        } else {
          // Fetch transcript only for non-duplicate videos
          try {
            console.log(`Fetching transcript for video ${video.videoId}: ${video.title}`)
            const transcript = await getVideoTranscript(video.videoId)
            videosToProcess.push({
              ...video,
              url: videoUrl,
              transcript
            })
          } catch (error: any) {
            console.error(`Failed to fetch transcript for ${video.videoId}:`, error.message)
            videosToProcess.push({
              ...video,
              url: videoUrl,
              transcript: '',
              error: error.message
            })
          }
        }
      }
    }

    const results = []
    
    logger.info('Processing videos', { count: videosToProcess.length })

    // Send progress updates via Server-Sent Events or WebSocket if needed
    // For now, we'll process all videos and return results
    
    for (let i = 0; i < videosToProcess.length; i++) {
      const video = videosToProcess[i]
      console.log(`Processing video ${i + 1}/${videosToProcess.length}: ${video.videoId}`)
      
      // Handle videos marked as duplicates during playlist processing
      if ('isDuplicate' in video && video.isDuplicate) {
        console.log(`Video ${video.videoId} is a duplicate, adding to results`)
        results.push({
          videoId: video.videoId,
          title: video.existingTitle || video.title,
          success: false,
          isDuplicate: true,
          existingTitle: video.existingTitle,
          error: video.error || `Already exists`,
          processedAt: new Date().toISOString()
        })
        continue
      }
      
      // Handle videos with errors or no transcript
      if ('error' in video && video.error || !video.transcript) {
        console.log(`Video ${video.videoId} has error: ${video.error || 'No transcript available'}`)
        results.push({
          videoId: video.videoId,
          title: video.title,
          success: false,
          error: ('error' in video && video.error) || 'No transcript available',
        })
        continue
      }

      try {

        // Calculate content hash
        const contentHash = crypto
          .createHash('sha256')
          .update(video.transcript)
          .digest('hex')

        // Store document source
        const { data: documentSource, error: sourceError } = await serviceClient
          .from('document_sources')
          .insert({
            title: video.title,
            content: video.transcript,
            file_hash: contentHash,
            source_url: 'url' in video ? video.url : null,
            source_type: 'url',
            metadata: {
              videoId: video.videoId,
              duration: video.duration
            }
          })
          .select()
          .single()

        if (sourceError) {
          console.error('Source insert error:', sourceError)
          // Handle unique constraint violation
          if (sourceError.code === '23505') { // Unique violation
            results.push({
              videoId: video.videoId,
              title: video.title,
              success: false,
              isDuplicate: true,
              error: 'This YouTube video has already been processed'
            })
            continue
          }
          throw new Error(sourceError.message)
        }
        
        logger.info('Document source created:', { id: documentSource.id, title: documentSource.title })

        // Chunk the transcript
        const chunks = chunkText(video.transcript)
        console.log(`Chunking transcript into ${chunks.length} chunks`)
        
        // Generate embeddings and store chunks
        const chunkPromises = chunks.map(async (chunk, i) => {
          try {
            logger.debug('Generating embedding for chunk', { current: i + 1, total: chunks.length })
            const embedding = await generateEmbedding(chunk)
            
            return {
              title: `${video.title} - Part ${i + 1}/${chunks.length}`,
              content: chunk,
              embedding,
              chunk_index: i,
              total_chunks: chunks.length,
              source_id: documentSource.id,
              metadata: {
                chunk_size: chunk.length,
                total_chunks: chunks.length,
                videoId: video.videoId
              }
            }
          } catch (embedError) {
            console.error(`Failed to generate embedding for chunk ${i}:`, embedError)
            throw embedError
          }
        })
        
        const chunkData = await Promise.all(chunkPromises)
        console.log(`Generated ${chunkData.length} embeddings`)
        
        // Store chunks in coach_documents
        const { data: insertedChunks, error: chunkError } = await serviceClient
          .from('coach_documents')
          .insert(chunkData)
          .select('id')

        if (chunkError) {
          console.error('Failed to store chunks:', chunkError)
          // If chunk storage fails, delete the source document
          await serviceClient
            .from('document_sources')
            .delete()
            .eq('id', documentSource.id)
          throw new Error(chunkError.message)
        }
        
        console.log(`Successfully stored ${chunks.length} chunks for video ${video.videoId}`)
        
        // Create coach document access records based on provided configuration
        if (insertedChunks && insertedChunks.length > 0) {
          const chunkIds = insertedChunks.map(chunk => chunk.id)
          
          // Create access for each document-coach combination with specified tiers
          for (const access of coachAccess) {
            const result = await createCoachDocumentAccess(
              chunkIds,
              [access.coachId as CoachId],
              access.accessTier as AccessTier
            )
            
            if (!result.success) {
              console.error(`Failed to create coach access for video ${video.videoId}, coach ${access.coachId}:`, result.error)
              // Don't fail the whole process, but log the error
            }
          }
          
          logger.info('Created coach access', { chunks: chunkIds.length, coaches: coachAccess.length })
        }

        results.push({
          videoId: video.videoId,
          success: true,
          documentId: documentSource.id,
          title: video.title,
          chunksCreated: chunks.length,
          url: 'url' in video ? video.url : null
        })
      } catch (error: any) {
        results.push({
          videoId: video.videoId,
          title: video.title,
          success: false,
          error: error.message,
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${successful} videos successfully, ${failed} failed`,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
      }
    })
  } catch (error: any) {
    console.error('YouTube process error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process YouTube content' },
      { status: 500 }
    )
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Create service client
    const serviceClient = await createServiceClient()

    // Normalize the YouTube URL for checking
    const videoUrl = `https://youtube.com/watch?v=${videoId}`
    const normalizedUrl = normalizeYouTubeUrl(videoUrl)
    
    // Check if document exists for this video
    const { data: document, error } = await serviceClient
      .from('document_sources')
      .select('*')
      .eq('source_url', normalizedUrl || videoUrl)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw new Error(error.message)
    }

    if (!document) {
      return NextResponse.json({
        exists: false,
        videoId,
      })
    }

    // Get active chunk count
    const { count } = await serviceClient
      .from('coach_documents')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', document.id)
      .eq('is_active', true)

    return NextResponse.json({
      exists: true,
      videoId,
      document: {
        id: document.id,
        title: document.title,
        sourceUrl: document.source_url,
        createdAt: document.created_at,
        chunkCount: count || 0,
        hasActiveChunks: (count || 0) > 0
      }
    })
  } catch (error: any) {
    console.error('YouTube status error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    )
  }
}