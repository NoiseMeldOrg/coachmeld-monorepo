import { YoutubeTranscript } from 'youtube-transcript'
import { Innertube } from 'youtubei.js'

export interface VideoTranscript {
  videoId: string
  title: string
  transcript: string
  duration: number
  error?: string
}

export async function getPlaylistVideos(playlistId: string): Promise<string[]> {
  try {
    console.log('Fetching playlist videos for:', playlistId)
    
    const youtube = await Innertube.create()
    const playlist = await youtube.getPlaylist(playlistId)
    
    if (!playlist || !playlist.items) {
      throw new Error('Playlist not found or empty')
    }
    
    // Extract video IDs from playlist items
    const videoIds = playlist.items
      .filter((item: any) => item.id) // Filter out any items without IDs
      .map((item: any) => item.id)
    
    console.log(`Found ${videoIds.length} videos in playlist`)
    return videoIds
    
  } catch (error: any) {
    console.error('Error fetching playlist:', error.message)
    throw new Error(`Failed to fetch playlist: ${error.message}`)
  }
}

export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    console.log('Fetching transcript from YouTube for video:', videoId)
    
    // First try the youtube-transcript library (faster but less reliable)
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId)
      
      if (transcript && transcript.length > 0) {
        console.log('Got transcript from youtube-transcript, segments:', transcript.length)
        const fullTranscript = transcript
          .map(segment => segment.text)
          .join(' ')
        
        if (fullTranscript.trim()) {
          console.log('Transcript length:', fullTranscript.length)
          return fullTranscript
        }
      }
    } catch (e) {
      console.log('youtube-transcript failed, trying youtubei.js...')
    }
    
    // Fallback to youtubei.js (more reliable but slower)
    console.log('Using youtubei.js to fetch transcript')
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
    
    console.log('Transcript fetched successfully with youtubei.js, length:', fullText.length)
    console.log('First 200 chars:', fullText.substring(0, 200))
    
    if (!fullText.trim()) {
      throw new Error('Transcript contains no text')
    }
    
    return fullText
  } catch (error: any) {
    console.error('Error in getVideoTranscript:', error.message)
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
    console.log('Fetching playlist metadata:', playlistId)
    
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
    
    console.log(`Found ${results.length} videos in playlist`)
    return results
    
  } catch (error: any) {
    console.error('Error fetching playlist metadata:', error)
    throw error
  }
}

// New function to fetch playlist metadata with transcript fetching
export async function processPlaylistWithTranscripts(
  playlistId: string,
  onProgress?: (videoId: string, status: 'processing' | 'success' | 'failed', error?: string) => void
): Promise<VideoTranscript[]> {
  try {
    console.log('Processing playlist with transcripts:', playlistId)
    
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
        console.error(`Failed to process video ${videoId}:`, error.message)
        
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
    
    console.log(`Processed ${results.length} videos from playlist`)
    return results
    
  } catch (error: any) {
    console.error('Error processing playlist:', error)
    throw error
  }
}