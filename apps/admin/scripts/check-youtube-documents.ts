#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkYouTubeDocuments() {
  console.log('🔍 Checking for YouTube documents in database...\n')

  // 1. Get all documents with source_type = 'url'
  const { data: urlDocs, error: urlError } = await supabase
    .from('document_sources')
    .select('*')
    .eq('source_type', 'url')
    .order('created_at', { ascending: false })

  if (urlError) {
    console.error('Error fetching URL documents:', urlError)
    return
  }

  console.log(`📄 Found ${urlDocs?.length || 0} documents with source_type='url'`)
  
  if (urlDocs && urlDocs.length > 0) {
    console.log('\nURL Documents:')
    urlDocs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.title}`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   URL: ${doc.source_url}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   Metadata:`, JSON.stringify(doc.metadata, null, 2))
    })
  }

  // 2. Check for documents with videoId in metadata
  const { data: youtubeDocs, error: ytError } = await supabase
    .from('document_sources')
    .select('*')
    .not('metadata->videoId', 'is', null)
    .order('created_at', { ascending: false })

  if (ytError) {
    console.error('Error fetching YouTube documents:', ytError)
    return
  }

  console.log(`\n📺 Found ${youtubeDocs?.length || 0} documents with videoId in metadata`)
  
  if (youtubeDocs && youtubeDocs.length > 0) {
    console.log('\nYouTube Documents:')
    youtubeDocs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.title}`)
      console.log(`   Video ID: ${doc.metadata?.videoId}`)
      console.log(`   Duration: ${doc.metadata?.duration}`)
    })
  }

  // 3. Check recent documents to see what's being created
  const { data: recentDocs, error: recentError } = await supabase
    .from('document_sources')
    .select('id, title, source_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!recentError && recentDocs) {
    console.log('\n📅 5 Most Recent Documents:')
    recentDocs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.title}`)
      console.log(`   Type: ${doc.source_type}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   Has videoId: ${doc.metadata?.videoId ? 'Yes' : 'No'}`)
    })
  }

  // 4. Count chunks for YouTube documents
  if (youtubeDocs && youtubeDocs.length > 0) {
    console.log('\n📊 Chunk counts for YouTube documents:')
    for (const doc of youtubeDocs) {
      const { count } = await supabase
        .from('coach_documents')
        .select('id', { count: 'exact', head: true })
        .eq('source_id', doc.id)
      
      console.log(`   ${doc.title}: ${count || 0} chunks`)
    }
  }
}

checkYouTubeDocuments().catch(console.error)