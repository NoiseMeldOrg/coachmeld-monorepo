#!/usr/bin/env tsx

async function testSimple() {
  try {
    // Import dynamically to see if there's an import issue
    const { YoutubeTranscript } = await import('youtube-transcript')
    
    console.log('YoutubeTranscript imported successfully')
    console.log('Available methods:', Object.keys(YoutubeTranscript))
    
    // Try the most basic call
    const videoId = 'dQw4w9WgXcQ' // Well-known video
    console.log(`\nTrying to fetch transcript for: ${videoId}`)
    
    const result = await YoutubeTranscript.fetchTranscript(videoId)
    console.log('Result type:', typeof result)
    console.log('Is array?', Array.isArray(result))
    console.log('Length:', result?.length)
    console.log('First item:', result?.[0])
    
  } catch (error: any) {
    console.error('Error:', error.message)
    console.error('Full error object:', error)
  }
}

testSimple()