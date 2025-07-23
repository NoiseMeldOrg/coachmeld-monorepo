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

async function testYouTubeMetadataQuery() {
  console.log('=== Testing YouTube Metadata Query ===\n')

  try {
    // First, let's create a test YouTube document (without actually processing a video)
    console.log('Creating a test YouTube document...')
    
    const testDoc = {
      title: 'Test YouTube Video',
      content: 'This is a test transcript content',
      file_hash: 'test-hash-' + Date.now(),
      source_url: 'https://youtube.com/watch?v=test123',
      source_type: 'url',
      metadata: {
        videoId: 'test123',
        duration: 300,
      }
    }

    const { data: createdDoc, error: createError } = await supabase
      .from('document_sources')
      .insert(testDoc)
      .select()
      .single()

    if (createError) {
      console.error('Error creating test document:', createError)
      return
    }

    console.log('Test document created successfully:')
    console.log(`  ID: ${createdDoc.id}`)
    console.log(`  Title: ${createdDoc.title}`)
    console.log(`  Metadata: ${JSON.stringify(createdDoc.metadata)}`)

    // Now test the various queries
    console.log('\n--- Testing metadata queries ---')

    // Test 1: Using -> operator
    const { data: query1, error: error1 } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .not('metadata->videoId', 'is', null)

    console.log(`\n1. Query with ->videoId: Found ${query1?.length || 0} records`)
    if (error1) console.error('   Error:', error1.message)

    // Test 2: Using ->> operator
    const { data: query2, error: error2 } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .not('metadata->>videoId', 'is', null)

    console.log(`\n2. Query with ->>videoId: Found ${query2?.length || 0} records`)
    if (error2) console.error('   Error:', error2.message)

    // Test 3: Using JSON containment
    const { data: query3, error: error3 } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .filter('metadata', '@>', { videoId: 'test123' })

    console.log(`\n3. Query with @> containment: Found ${query3?.length || 0} records`)
    if (error3) console.error('   Error:', error3.message)

    // Test 4: Check specific test document
    const { data: query4, error: error4 } = await supabase
      .from('document_sources')
      .select('id, title, metadata')
      .eq('id', createdDoc.id)
      .single()

    console.log(`\n4. Direct query for test document:`)
    if (query4) {
      console.log(`   Found: ${query4.title}`)
      console.log(`   Metadata: ${JSON.stringify(query4.metadata)}`)
      console.log(`   Has videoId property: ${'videoId' in (query4.metadata || {})}`)
    }
    if (error4) console.error('   Error:', error4.message)

    // Clean up - delete the test document
    console.log('\n--- Cleaning up ---')
    const { error: deleteError } = await supabase
      .from('document_sources')
      .delete()
      .eq('id', createdDoc.id)

    if (deleteError) {
      console.error('Error deleting test document:', deleteError)
    } else {
      console.log('Test document deleted successfully')
    }

    // Final check - count YouTube documents
    console.log('\n--- Final YouTube document count ---')
    const { count } = await supabase
      .from('document_sources')
      .select('id', { count: 'exact', head: true })
      .not('metadata->videoId', 'is', null)

    console.log(`Total YouTube documents in database: ${count || 0}`)

  } catch (error) {
    console.error('Unexpected error:', error)
  }

  console.log('\n=== Test Complete ===')
}

// Run the test
testYouTubeMetadataQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })