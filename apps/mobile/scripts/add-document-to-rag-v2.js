#!/usr/bin/env node

/**
 * Add documents to the RAG system with support for multiple coaches
 * Processes documents, generates embeddings, and stores in database
 * 
 * Usage: node scripts/add-document-to-rag-v2.js <file-path> --coaches <coach-ids> [options]
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const GeminiEmbeddingService = require('./gemini-embeddings');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

// Validate environment
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!geminiApiKey) {
  console.error('❌ Missing GEMINI_API_KEY in .env file');
  process.exit(1);
}

// Initialize services
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const embeddingService = new GeminiEmbeddingService(geminiApiKey);

// Define all diet coaches
const ALL_DIET_COACHES = ['carnivore', 'carnivore-pro', 'paleo', 'lowcarb', 'keto', 'ketovore', 'lion'];

/**
 * Read and process document file
 */
async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath, 'utf8');
  
  return {
    fileName: path.basename(filePath),
    fileType: ext.slice(1), // Remove the dot
    fileSize: (await fs.stat(filePath)).size,
    content: content,
    metadata: {
      originalPath: filePath,
      uploadedAt: new Date().toISOString()
    }
  };
}

/**
 * Create document source record (without coach_id)
 */
async function createDocumentSource(doc, options) {
  const { data: source, error } = await supabase
    .from('document_sources')
    .insert({
      title: options.title || doc.fileName,
      source_type: doc.fileType,
      file_size_bytes: doc.fileSize,
      process_status: 'processing',
      metadata: {
        ...doc.metadata,
        access_tier: options.tier || 'free',
        tags: options.tags || [],
        coaches: options.coaches // Store which coaches this is for
      },
      // Attribution fields
      supplied_by: options.suppliedBy || 'Internal Team',
      supplier_type: options.supplierType || 'internal_team',
      supplier_email: options.supplierEmail,
      license_type: options.license || 'proprietary',
      copyright_holder: options.copyright || 'NoiseMeld'
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create document source: ${error.message}`);
  }
  
  return source;
}

/**
 * Process document into chunks with embeddings
 */
async function processDocument(doc, source, options) {
  console.log('📄 Processing document...');
  
  // Split content into chunks
  const chunks = embeddingService.splitTextIntoChunks(doc.content, 6000); // Leave room for metadata
  console.log(`   Split into ${chunks.length} chunks`);
  
  const documents = [];
  const errors = [];
  
  // Generate embeddings for each chunk
  console.log('🧮 Generating embeddings...');
  const embeddings = await embeddingService.generateBatchEmbeddings(
    chunks,
    (progress) => {
      process.stdout.write(`\r   Progress: ${progress.current}/${progress.total} (${progress.percentage}%)`);
    }
  );
  console.log('\n');
  
  // Prepare documents for insertion (without coach_id)
  for (let i = 0; i < chunks.length; i++) {
    if (!embeddings[i]) {
      errors.push(`Chunk ${i + 1}: Failed to generate embedding`);
      continue;
    }
    
    documents.push({
      source_id: source.id,
      title: `${source.title} - Part ${i + 1}/${chunks.length}`,
      content: chunks[i],
      chunk_index: i,
      total_chunks: chunks.length,
      embedding: embeddings[i],
      metadata: {
        chunk_size: chunks[i].length,
        position: i,
        access_tier: options.tier || 'free'
      }
    });
  }
  
  // Insert documents with embeddings
  if (documents.length > 0) {
    console.log(`💾 Storing ${documents.length} document chunks...`);
    
    const { data: insertedDocs, error: insertError } = await supabase
      .from('coach_documents')
      .insert(documents)
      .select('id');
    
    if (insertError) {
      throw new Error(`Failed to insert documents: ${insertError.message}`);
    }
    
    // Create coach access entries
    if (insertedDocs && insertedDocs.length > 0) {
      console.log(`🔗 Creating coach access for ${options.coaches.length} coaches...`);
      
      for (const doc of insertedDocs) {
        // Use the helper function to add coach access
        const { error: accessError } = await supabase.rpc('add_coach_document_access', {
          p_document_id: doc.id,
          p_coach_ids: options.coaches,
          p_access_tier: options.tier || 'free'
        });
        
        if (accessError) {
          console.error(`⚠️  Failed to create coach access for document ${doc.id}:`, accessError.message);
        }
      }
    }
  }
  
  // Update source status
  const { error: updateError } = await supabase
    .from('document_sources')
    .update({
      process_status: errors.length > 0 ? 'failed' : 'completed',
      last_processed: new Date().toISOString(),
      error_message: errors.length > 0 ? errors.join('; ') : null
    })
    .eq('id', source.id);
  
  if (updateError) {
    console.error('⚠️  Failed to update source status:', updateError.message);
  }
  
  return {
    processed: documents.length,
    errors: errors.length,
    coaches: options.coaches
  };
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node scripts/add-document-to-rag-v2.js <file-path> --coaches <coach-ids> [options]

Required:
  <file-path>              Path to the document to add
  --coaches <ids>          Comma-separated coach IDs or 'all-diet' for all diet coaches

Options:
  --title <title>          Document title (defaults to filename)
  --tier <tier>            Access tier: free, premium, pro (default: free)
  --tags <tags>            Comma-separated tags
  --description <desc>     Document description
  --type <type>            Document type (guide, faq, article, research, protocol)
  --public                 Make document publicly viewable
  --debug                  Show detailed debug output

Attribution options:
  --supplied-by <name>     Who supplied the document
  --supplier-type <type>   Type: partner_doctor, internal_team, community, etc.
  --supplier-email <email> Supplier email
  --license <type>         License type (proprietary, cc_by, public_domain, etc.)
  --copyright <holder>     Copyright holder

Examples:
  # Add to specific coaches
  node scripts/add-document-to-rag-v2.js docs/guide.md --coaches carnivore,paleo,keto
  
  # Add to all diet coaches
  node scripts/add-document-to-rag-v2.js docs/guide.md --coaches all-diet
  
  # Add with full options
  node scripts/add-document-to-rag-v2.js research.pdf --coaches carnivore,keto --tier premium --tags "research,clinical"
    `);
    process.exit(0);
  }
  
  const options = {
    filePath: args[0],
    coaches: [],
    title: null,
    tier: 'free',
    tags: [],
    suppliedBy: 'Internal Team',
    supplierType: 'internal_team',
    supplierEmail: null,
    license: 'proprietary',
    copyright: 'NoiseMeld'
  };
  
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--coaches':
        if (value === 'all-diet') {
          options.coaches = ALL_DIET_COACHES;
        } else {
          options.coaches = value.split(',').map(c => c.trim());
        }
        break;
      case '--title':
        options.title = value;
        break;
      case '--tier':
        options.tier = value;
        break;
      case '--tags':
        options.tags = value.split(',').map(t => t.trim());
        break;
      case '--supplied-by':
        options.suppliedBy = value;
        break;
      case '--supplier-type':
        options.supplierType = value;
        break;
      case '--supplier-email':
        options.supplierEmail = value;
        break;
      case '--license':
        options.license = value;
        break;
      case '--copyright':
        options.copyright = value;
        break;
    }
  }
  
  if (options.coaches.length === 0) {
    console.error('❌ Missing required --coaches parameter');
    process.exit(1);
  }
  
  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('🚀 Adding document to RAG system\n');
  console.log('📋 Configuration:');
  console.log(`   File: ${options.filePath}`);
  console.log(`   Coaches: ${options.coaches.join(', ')}`);
  console.log(`   Tier: ${options.tier}`);
  console.log(`   Supplier: ${options.suppliedBy} (${options.supplierType})`);
  console.log('');
  
  try {
    // Read document
    const doc = await readDocument(options.filePath);
    console.log(`✅ Read document: ${doc.fileName} (${(doc.fileSize / 1024).toFixed(1)} KB)`);
    
    // Create source record
    const source = await createDocumentSource(doc, options);
    console.log(`✅ Created source record: ${source.id}`);
    
    // Process and embed document
    const result = await processDocument(doc, source, options);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Document added successfully!');
    console.log(`   Chunks processed: ${result.processed}`);
    console.log(`   Coaches linked: ${result.coaches.length} (${result.coaches.join(', ')})`);
    if (result.errors > 0) {
      console.log(`   ⚠️  Errors: ${result.errors}`);
    }
    console.log(`   Source ID: ${source.id}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  readDocument,
  createDocumentSource,
  processDocument
};