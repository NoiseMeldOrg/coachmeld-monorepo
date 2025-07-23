#!/usr/bin/env tsx
import { YoutubeTranscript } from 'youtube-transcript'

// Enable debug logging
if (process.env.DEBUG) {
  console.log('Debug mode enabled')
}

async function testTranscript() {
  const videoId = process.argv[2] || 'gInmDSDyfBs'
  
  console.log(`Testing YouTube transcript for video: ${videoId}`)
  console.log(`URL: https://youtube.com/watch?v=${videoId}`)
  
  try {
    console.log('\nFetching transcript...')
    // Try with options
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    })
    
    console.log(`\nTranscript segments received: ${transcript.length}`)
    
    if (transcript.length > 0) {
      console.log('\nFirst 5 segments:')
      transcript.slice(0, 5).forEach((segment, i) => {
        console.log(`${i + 1}. [${segment.offset}ms] ${segment.text}`)
      })
      
      const fullText = transcript.map(s => s.text).join(' ')
      console.log(`\nTotal transcript length: ${fullText.length} characters`)
      console.log(`\nFirst 300 characters:\n${fullText.substring(0, 300)}...`)
    } else {
      console.log('No transcript segments found!')
    }
  } catch (error: any) {
    console.error('\nError fetching transcript:')
    console.error('Error type:', error.constructor.name)
    console.error('Message:', error.message)
    
    // Check for specific error types
    if (error.message.includes('Transcript is disabled')) {
      console.error('This video has transcripts disabled by the uploader')
    } else if (error.message.includes('Video unavailable')) {
      console.error('This video is unavailable')
    } else if (error.message.includes('not available')) {
      console.error('Transcripts are not available for this video')
    } else if (error.message.includes('Too many requests')) {
      console.error('YouTube is rate limiting requests')
    }
    
    console.error('\nFull error:', error)
  }
}

testTranscript().catch(console.error)