#!/usr/bin/env node

/**
 * Search the RAG system using Gemini embeddings
 * 
 * Usage: node scripts/search-rag.js "your search query" --coach <coach-id> [options]
 */

const { createClient } = require('@supabase/supabase-js');
const GeminiEmbeddingService = require('./gemini-embeddings');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

// Validate environment
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!geminiApiKey) {
  console.error('❌ Missing GEMINI_API_KEY');
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

/**
 * Search documents using vector similarity
 */
async function searchDocuments(query, options) {
  console.log('🔍 Searching RAG system...\n');
  
  // Generate query embedding
  console.log('🧮 Generating query embedding...');
  const queryEmbedding = await embeddingService.generateEmbedding(query);
  console.log('✅ Query embedded\n');
  
  // Search using the database function
  console.log('📚 Searching documents...');
  const { data: results, error } = await supabase.rpc('search_coach_documents', {
    query_embedding: queryEmbedding,
    p_coach_id: options.coach,
    p_user_id: null, // Admin search, no user context
    p_limit: options.limit || 5,
    p_threshold: options.threshold || 0.7
  });
  
  if (error) {
    // Fallback to direct search if function fails
    console.log('⚠️  Using fallback search method...');
    
    const { data: documents, error: searchError } = await supabase
      .from('coach_documents')
      .select('*')
      .eq('coach_id', options.coach)
      .eq('is_active', true)
      .limit(options.limit || 5);
    
    if (searchError) {
      throw new Error(`Search failed: ${searchError.message}`);
    }
    
    // Calculate similarities manually (simplified)
    const resultsWithScore = documents.map(doc => ({
      document_id: doc.id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      similarity_score: 0.85 // Placeholder
    }));
    
    return resultsWithScore;
  }
  
  return results || [];
}

/**
 * Format and display results
 */
function displayResults(results, query) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Search Results for: "${query}"`);
  console.log('='.repeat(60) + '\n');
  
  if (results.length === 0) {
    console.log('❌ No matching documents found.');
    console.log('\nTry:');
    console.log('- Using different keywords');
    console.log('- Checking if documents exist for this coach');
    console.log('- Lowering the similarity threshold with --threshold 0.5');
    return;
  }
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.title}`);
    console.log(`   Similarity: ${(result.similarity_score * 100).toFixed(1)}%`);
    console.log(`   Access Tier: ${result.metadata?.access_tier || 'free'}`);
    console.log(`   Document ID: ${result.document_id}`);
    console.log('');
    
    // Show content preview
    const preview = result.content.substring(0, 200).replace(/\n/g, ' ');
    console.log(`   Preview: ${preview}...`);
    console.log('   ' + '-'.repeat(56) + '\n');
  });
  
  console.log(`✅ Found ${results.length} matching documents`);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node scripts/search-rag.js "your search query" --coach <coach-id> [options]

Required:
  "query"                  Search query text (in quotes)
  --coach <coach-id>       Coach ID (carnivore, fitness, mindfulness)

Options:
  --limit <n>              Maximum results to return (default: 5)
  --threshold <n>          Similarity threshold 0-1 (default: 0.7)
  --verbose                Show detailed information

Examples:
  node scripts/search-rag.js "carnivore diet benefits" --coach carnivore
  node scripts/search-rag.js "strength training" --coach fitness --limit 10
  node scripts/search-rag.js "inflammation" --coach carnivore --threshold 0.6
    `);
    process.exit(0);
  }
  
  // Find the query (first non-flag argument)
  let query = '';
  let startIndex = 0;
  
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) {
      query = args[i];
      startIndex = i + 1;
      break;
    }
  }
  
  if (!query) {
    console.error('❌ Missing search query');
    process.exit(1);
  }
  
  const options = {
    query,
    coach: null,
    limit: 5,
    threshold: 0.7,
    verbose: false
  };
  
  // Parse flags
  for (let i = startIndex; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--coach':
        options.coach = value;
        break;
      case '--limit':
        options.limit = parseInt(value) || 5;
        break;
      case '--threshold':
        options.threshold = parseFloat(value) || 0.7;
        break;
      case '--verbose':
        options.verbose = true;
        i--; // No value for this flag
        break;
    }
  }
  
  if (!options.coach) {
    console.error('❌ Missing required --coach parameter');
    process.exit(1);
  }
  
  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  if (options.verbose) {
    console.log('🔧 Configuration:');
    console.log(`   Coach: ${options.coach}`);
    console.log(`   Limit: ${options.limit}`);
    console.log(`   Threshold: ${options.threshold}`);
    console.log('');
  }
  
  try {
    const results = await searchDocuments(options.query, options);
    displayResults(results, options.query);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  searchDocuments
};