import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugYoutubeTranscripts() {
  console.log('=== YouTube Transcript Debug Script ===\n')

  try {
    // 1. Get total document_sources count
    const { count: totalCount, error: countError } = await supabase
      .from('document_sources')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting documents:', countError)
    } else {
      console.log(`Total document_sources count: ${totalCount}\n`)
    }

    // 2. Get all source types that exist
    const { data: sourceTypes, error: typeError } = await supabase
      .from('document_sources')
      .select('source_type')
      .not('source_type', 'is', null)

    if (typeError) {
      console.error('Error fetching source types:', typeError)
    } else {
      const uniqueTypes = Array.from(new Set(sourceTypes?.map(s => s.source_type) || []))
      console.log(`Unique source_type values found: ${uniqueTypes.join(', ')}`)
    }

    // 3. Get ALL records to inspect metadata
    const { data: allSources, error: allError } = await supabase
      .from('document_sources')
      .select('id, title, source_type, metadata, created_at')
      .order('created_at', { ascending: false })

    if (allError) {
      console.error('Error fetching all sources:', allError)
    } else {
      console.log(`\nTotal records retrieved: ${allSources?.length || 0}`)
      
      if (allSources && allSources.length > 0) {
        console.log('\n--- All Document Sources ---')
        allSources.forEach((source, index) => {
          console.log(`\n[${index + 1}] ID: ${source.id}`)
          console.log(`    Title: ${source.title}`)
          console.log(`    Source Type: ${source.source_type}`)
          console.log(`    Created: ${source.created_at}`)
          console.log(`    Metadata: ${JSON.stringify(source.metadata, null, 2)}`)
          
          // Check if metadata contains YouTube-related fields
          if (source.metadata && typeof source.metadata === 'object') {
            const metadataStr = JSON.stringify(source.metadata).toLowerCase()
            if (metadataStr.includes('youtube') || metadataStr.includes('videoid') || metadataStr.includes('video')) {
              console.log(`    *** Contains YouTube-related metadata ***`)
            }
          }
        })
      }
    }

    // 4. Test the metadata->videoId query
    console.log('\n--- Testing metadata->videoId query ---')
    
    const { data: videoIdQuery, error: videoIdError } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .not('metadata->videoId', 'is', null)

    if (videoIdError) {
      console.error('Error with metadata->videoId query:', videoIdError)
    } else {
      console.log(`Records with metadata->videoId: ${videoIdQuery?.length || 0}`)
      
      if (videoIdQuery && videoIdQuery.length > 0) {
        console.log('\n--- Records with videoId in metadata ---')
        videoIdQuery.forEach((record, index) => {
          console.log(`\n[${index + 1}] ID: ${record.id}`)
          console.log(`    Title: ${record.title}`)
          console.log(`    Metadata: ${JSON.stringify(record.metadata, null, 2)}`)
        })
      }
    }

    // 5. Alternative query approaches
    console.log('\n--- Testing alternative query approaches ---')
    
    // Try JSON containment
    const { data: jsonContains, error: jsonContainsError } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .filter('metadata', '@>', { videoId: '' })

    if (!jsonContainsError) {
      console.log(`\nRecords using JSON containment (@>): ${jsonContains?.length || 0}`)
    }

    // Try text search in metadata
    const { data: textSearch, error: textSearchError } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .textSearch('metadata::text', 'videoId')

    if (!textSearchError) {
      console.log(`Records using text search: ${textSearch?.length || 0}`)
    }

    // 6. Check for any source_url that looks like YouTube
    console.log('\n--- Checking for YouTube URLs in source_url field ---')
    
    const { data: urlRecords, error: urlError } = await supabase
      .from('document_sources')
      .select('id, title, source_url, source_type, metadata')
      .or('source_url.ilike.%youtube.com%,source_url.ilike.%youtu.be%')

    if (!urlError && urlRecords) {
      console.log(`Records with YouTube URLs: ${urlRecords.length}`)
      urlRecords.forEach((record, index) => {
        console.log(`\n[${index + 1}] YouTube URL Record:`)
        console.log(`    ID: ${record.id}`)
        console.log(`    Title: ${record.title}`)
        console.log(`    Source Type: ${record.source_type}`)
        console.log(`    Source URL: ${record.source_url}`)
        console.log(`    Metadata: ${JSON.stringify(record.metadata, null, 2)}`)
      })
    }

    // 7. Try different variations of the metadata query
    console.log('\n--- Testing different metadata query variations ---')
    
    // Try with ->> operator
    const { data: arrowQuery, error: arrowError } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .not('metadata->>videoId', 'is', null)

    if (!arrowError) {
      console.log(`\nRecords using ->> operator: ${arrowQuery?.length || 0}`)
    }

    // Check if we need to look for YouTube videos processed today
    console.log('\n--- Checking for recently added documents ---')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayDocs, error: todayError } = await supabase
      .from('document_sources')
      .select('id, title, source_type, source_url, metadata, created_at')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (!todayError && todayDocs) {
      console.log(`\nDocuments added today: ${todayDocs.length}`)
      todayDocs.forEach((doc, index) => {
        console.log(`\n[${index + 1}] Recent Document:`)
        console.log(`    ID: ${doc.id}`)
        console.log(`    Title: ${doc.title}`)
        console.log(`    Source Type: ${doc.source_type}`)
        console.log(`    Source URL: ${doc.source_url}`)
        console.log(`    Created: ${doc.created_at}`)
        console.log(`    Metadata: ${JSON.stringify(doc.metadata, null, 2)}`)
      })
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }

  console.log('\n=== Debug Complete ===')
}

// Run the debug script
debugYoutubeTranscripts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })