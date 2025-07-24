import { YoutubeTranscript } from 'youtube-transcript'
import { Innertube } from 'youtubei.js'
import { logger } from '../../../../packages/shared-utils/src/logger'

export interface VideoTranscript {
  videoId: string
  title: string
  transcript: string
  duration: number
  error?: string
}

export async function getPlaylistVideos(playlistId: string): Promise<string[]> {
  try {
    logger.info('Fetching playlist videos', { playlistId })
    
    const youtube = await Innertube.create()
    const playlist = await youtube.getPlaylist(playlistId)
    
    if (!playlist || !playlist.items) {
      throw new Error('Playlist not found or empty')
    }
    
    // Extract video IDs from playlist items
    const videoIds = playlist.items
      .filter((item: any) => item.id) // Filter out any items without IDs
      .map((item: any) => item.id)
    
    logger.info('Found videos in playlist', { playlistId, videoCount: videoIds.length })
    return videoIds
    
  } catch (error: any) {
    logger.error('Error fetching playlist', { playlistId, error: error.message })
    throw new Error(`Failed to fetch playlist: ${error.message}`)
  }
}

export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    logger.info('Fetching YouTube transcript', { videoId })
    
    // First try the youtube-transcript library (faster but less reliable)
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId)
      
      if (transcript && transcript.length > 0) {
        logger.info('Got transcript from youtube-transcript', { videoId, segmentCount: transcript.length })
        const fullTranscript = transcript
          .map(segment => segment.text)
          .join(' ')
        
        if (fullTranscript.trim()) {
          logger.info('Transcript retrieved successfully', { videoId, length: fullTranscript.length })
          return fullTranscript
        }
      }
    } catch (e) {
      logger.debug('youtube-transcript failed, trying youtubei.js', { videoId })
    }
    
    // Fallback to youtubei.js (more reliable but slower)
    logger.debug('Using youtubei.js to fetch transcript', { videoId })
    const youtube = await Innertube.create()
    const info = await youtube.getInfo(videoId)
    
    // Get transcript
    const transcriptData = await info.getTranscript()
    
    if (!transcriptData || !transcriptData.transcript) {
      throw new Error('No transcript available')
    }
    
    // Get the transcript content
    const { transcript } = transcriptData
    const segments = transcript.content?.body?.initial_segments || []
    
    if (segments.length === 0) {
      throw new Error('Transcript is empty')
    }
    
    // Combine segments into full text
    const fullText = segments
      .map((segment: any) => segment.snippet?.text || '')
      .filter((text: string) => text.trim())
      .join(' ')
    
    logger.info('Transcript fetched with youtubei.js', { 
      videoId, 
      length: fullText.length, 
      preview: fullText.substring(0, 200) 
    })
    
    if (!fullText.trim()) {
      throw new Error('Transcript contains no text')
    }
    
    return fullText
  } catch (error: any) {
    logger.error('Error in getVideoTranscript', { videoId, error: error.message })
    // Handle specific error cases
    if (error.message.includes('not available') || 
        error.message.includes('Transcript is disabled') || 
        error.message.includes('No transcript') ||
        error.message.includes('Could not get transcripts') ||
        error.message.includes('Transcript panel not found')) {
      throw new Error('Transcript not available for this video')
    }
    if (error.message.includes('Video unavailable') || 
        error.message.includes('This video is unavailable') ||
        error.message.includes('Private video') ||
        error.message.includes('Video has been removed')) {
      throw new Error('Video unavailable')
    }
    // Generic error
    throw error
  }
}

export async function processPlaylist(
  playlistId: string,
  onProgress?: (videoId: string, status: 'processing' | 'success' | 'failed', error?: string) => void
): Promise<VideoTranscript[]> {
  // This function now only fetches metadata, not transcripts
  // Transcripts should be fetched individually after duplicate checks
  try {
    logger.info('Fetching playlist metadata', { playlistId })
    
    const youtube = await Innertube.create()
    const playlist = await youtube.getPlaylist(playlistId)
    
    if (!playlist || !playlist.items) {
      throw new Error('Playlist not found or empty')
    }
    
    const results: VideoTranscript[] = []
    
    // Process each video metadata (without fetching transcript)
    for (const item of playlist.items) {
      let videoId: string | undefined
      let title: string = ''
      let duration: number = 0
      
      if ('id' in item && item.id) {
        videoId = item.id
      }
      if (!videoId) continue
      
      // Extract title based on item type
      if ('title' in item && item.title) {
        title = typeof item.title === 'string' ? item.title : item.title.text || `Video ${videoId}`
      } else {
        title = `Video ${videoId}`
      }
      
      // Extract duration if available
      if ('duration' in item && item.duration) {
        duration = typeof item.duration === 'number' ? item.duration : item.duration.seconds || 0
      }
      
      // Return metadata only, transcript will be fetched later
      results.push({
        videoId,
        title,
        transcript: '', // Empty transcript, to be filled later if not duplicate
        duration,
      })
    }
    
    logger.info('Found videos in playlist metadata', { playlistId, videoCount: results.length })
    return results
    
  } catch (error: any) {
    logger.error('Error fetching playlist metadata', { playlistId, error })
    throw error
  }
}

// New function to fetch playlist metadata with transcript fetching
export async function processPlaylistWithTranscripts(
  playlistId: string,
  onProgress?: (videoId: string, status: 'processing' | 'success' | 'failed', error?: string) => void
): Promise<VideoTranscript[]> {
  try {
    logger.info('Processing playlist with transcripts', { playlistId })
    
    const youtube = await Innertube.create()
    const playlist = await youtube.getPlaylist(playlistId)
    
    if (!playlist || !playlist.items) {
      throw new Error('Playlist not found or empty')
    }
    
    const results: VideoTranscript[] = []
    
    // Process each video in the playlist
    for (const item of playlist.items) {
      // Type guard to handle different item types
      let videoId: string | undefined
      let title: string = ''
      let duration: number = 0
      
      if ('id' in item && item.id) {
        videoId = item.id
      }
      if (!videoId) continue
      
      // Extract title based on item type
      if ('title' in item && item.title) {
        title = typeof item.title === 'string' ? item.title : item.title.text || `Video ${videoId}`
      } else {
        title = `Video ${videoId}`
      }
      
      // Extract duration if available
      if ('duration' in item && item.duration) {
        duration = typeof item.duration === 'number' ? item.duration : item.duration.seconds || 0
      }
      
      onProgress?.(videoId, 'processing')
      
      try {
        const transcript = await getVideoTranscript(videoId)
        
        results.push({
          videoId,
          title,
          transcript,
          duration,
        })
        
        onProgress?.(videoId, 'success')
      } catch (error: any) {
        logger.error('Failed to process video transcript', { videoId, error: error.message })
        
        results.push({
          videoId,
          title,
          transcript: '',
          duration,
          error: error.message,
        })
        
        onProgress?.(videoId, 'failed', error.message)
      }
    }
    
    logger.info('Processed playlist with transcripts complete', { playlistId, processedCount: results.length })
    return results
    
  } catch (error: any) {
    logger.error('Error processing playlist', { playlistId, error })
    throw error
  }
}