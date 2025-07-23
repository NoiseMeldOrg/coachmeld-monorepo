#!/usr/bin/env tsx
import { getVideoTranscriptAlternative } from '../services/youtube/transcript-youtubei'

async function test() {
  const videoId = process.argv[2] || 'gInmDSDyfBs'
  
  try {
    console.log(`Testing transcript fetch for video: ${videoId}`)
    const transcript = await getVideoTranscriptAlternative(videoId)
    
    console.log('\nSuccess!')
    console.log('Transcript length:', transcript.length)
    console.log('\nFirst 500 characters:')
    console.log(transcript.substring(0, 500))
    
  } catch (error: any) {
    console.error('Failed:', error.message)
  }
}

test()