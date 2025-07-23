import { Innertube } from 'youtubei.js'

export async function getVideoTranscriptAlternative(videoId: string): Promise<string> {
  try {
    console.log('Using youtubei.js to fetch transcript for:', videoId)
    
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
    
    console.log('Transcript fetched successfully, length:', fullText.length)
    return fullText
    
  } catch (error: any) {
    console.error('Error fetching transcript with youtubei.js:', error)
    if (error.message.includes('No transcript')) {
      throw new Error('Transcript not available for this video')
    }
    throw error
  }
}