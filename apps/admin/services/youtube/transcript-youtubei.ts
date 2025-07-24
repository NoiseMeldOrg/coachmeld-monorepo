import { Innertube } from 'youtubei.js'
import { logger } from '../../../../packages/shared-utils/src/logger'

export async function getVideoTranscriptAlternative(videoId: string): Promise<string> {
  try {
    logger.debug('Using youtubei.js to fetch transcript', { videoId })
    
    // Create YouTube client
    const youtube = await Innertube.create()
    
    // Get video info
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
    
    logger.info('Transcript fetched successfully with youtubei.js', { videoId, length: fullText.length })
    return fullText
    
  } catch (error: any) {
    logger.error('Error fetching transcript with youtubei.js', { videoId, error })
    if (error.message.includes('No transcript')) {
      throw new Error('Transcript not available for this video')
    }
    throw error
  }
}