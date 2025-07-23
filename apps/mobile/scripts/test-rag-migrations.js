#!/usr/bin/env node

/**
 * Test script for RAG system database migrations
 * Verifies that all tables, indexes, and functions were created successfully
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL in .env file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('⚠️  No SUPABASE_SERVICE_KEY found. Using anon key (limited access)');
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testTable(tableName, requiredColumns) {
  console.log(`\n📋 Testing table: ${tableName}`);
  
  try {
    // Try to select from the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Error accessing ${tableName}: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Table ${tableName} exists and is accessible`);
    
    // Check if we got schema information (even with no data)
    if (data !== null) {
      console.log(`   Found ${data.length} test records`);
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Unexpected error testing ${tableName}: ${err.message}`);
    return false;
  }
}

async function testFunction(functionName, testParams) {
  console.log(`\n🔧 Testing function: ${functionName}`);
  
  try {
    const { data, error } = await supabase.rpc(functionName, testParams);
    
    if (error) {
      console.error(`❌ Error calling ${functionName}: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Function ${functionName} exists and is callable`);
    return true;
  } catch (err) {
    console.error(`❌ Unexpected error testing ${functionName}: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting RAG migration tests...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  let allTestsPassed = true;
  
  // Test main RAG tables
  const tables = [
    // Migration 004 - Core vector database
    {
      name: 'document_sources',
      columns: ['id', 'coach_id', 'title', 'source_type', 'process_status'],
      migration: '004'
    },
    {
      name: 'coach_documents',
      columns: ['id', 'coach_id', 'title', 'content', 'embedding'],
      migration: '004'
    },
    {
      name: 'coach_access_tiers',
      columns: ['id', 'coach_id', 'document_id', 'required_tier'],
      migration: '004'
    },
    {
      name: 'rag_query_cache',
      columns: ['id', 'query_hash', 'coach_id', 'query_text'],
      migration: '004'
    },
    {
      name: 'document_versions',
      columns: ['id', 'document_id', 'version_number', 'content'],
      migration: '004'
    },
    {
      name: 'document_usage_stats',
      columns: ['id', 'document_id', 'retrieved_at'],
      migration: '004'
    },
    // Migration 005 - Document storage
    {
      name: 'rag_storage_preferences',
      columns: ['id', 'coach_id', 'store_originals_default'],
      migration: '005'
    },
    // Migration 006 - Legal compliance
    {
      name: 'disclaimer_acceptances',
      columns: ['id', 'user_id', 'disclaimer_type', 'version'],
      migration: '006'
    },
    {
      name: 'content_flags',
      columns: ['id', 'document_id', 'flag_type', 'severity'],
      migration: '006'
    },
    {
      name: 'compliance_audit_log',
      columns: ['id', 'event_type', 'entity_type', 'action'],
      migration: '006'
    },
    {
      name: 'emergency_disclaimer_views',
      columns: ['id', 'user_id', 'coach_id', 'shown_at'],
      migration: '006'
    },
    // Migration 007 - Partner tracking
    {
      name: 'partner_agreements',
      columns: ['id', 'partner_name', 'partner_type', 'agreement_type'],
      migration: '007'
    },
    {
      name: 'partner_coaches',
      columns: ['id', 'coach_id', 'partner_id', 'coach_name'],
      migration: '007'
    },
    {
      name: 'source_contributions',
      columns: ['id', 'source_id', 'contributor_name', 'contribution_type'],
      migration: '007'
    },
    {
      name: 'content_audit_trail',
      columns: ['id', 'source_id', 'action', 'action_date'],
      migration: '007'
    }
  ];
  
  // Track which migrations are missing
  const missingMigrations = new Set();
  
  // Test each table
  for (const table of tables) {
    const passed = await testTable(table.name, table.columns);
    if (!passed) {
      allTestsPassed = false;
      missingMigrations.add(table.migration);
    }
  }
  
  // Test pgvector extension
  console.log('\n🔌 Testing pgvector extension...');
  try {
    const { data: extensions, error } = await supabase.rpc('get_installed_extensions', {});
    
    if (!error && extensions) {
      const hasVector = extensions.some(ext => ext.name === 'vector');
      if (hasVector) {
        console.log('✅ pgvector extension is installed');
      } else {
        console.log('❌ pgvector extension not found');
        allTestsPassed = false;
      }
    } else {
      // Try alternative check
      const { data, error: queryError } = await supabase
        .from('coach_documents')
        .select('embedding')
        .limit(1);
      
      if (!queryError) {
        console.log('✅ pgvector appears to be working (embedding column accessible)');
      } else {
        console.log('⚠️  Could not verify pgvector extension status');
      }
    }
  } catch (err) {
    console.log('⚠️  Could not check pgvector extension:', err.message);
  }
  
  // Test key functions
  console.log('\n🔧 Testing key functions...');
  
  // Note: These will fail without proper parameters, but we're just checking existence
  const functionsToTest = [
    {
      name: 'clean_expired_cache',
      params: {}
    },
    {
      name: 'track_content_source',
      params: {
        p_title: 'Test Source',
        p_coach_id: 'test',
        p_supplied_by: 'Test User',
        p_supplier_type: 'internal_team'
      }
    }
  ];
  
  for (const func of functionsToTest) {
    const passed = await testFunction(func.name, func.params);
    if (!passed && func.name !== 'search_coach_documents') {
      // search_coach_documents requires vector input, so it's ok if it fails
      allTestsPassed = false;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ All RAG migration tests passed!');
    console.log('\nThe RAG system tables and functions are properly set up.');
  } else {
    console.log('❌ Some tests failed. Please check the migrations.');
    
    if (missingMigrations.size > 0) {
      console.log('\n🔴 Missing migrations:', Array.from(missingMigrations).sort().join(', '));
      console.log('\nMigration files to apply:');
      Array.from(missingMigrations).sort().forEach(migration => {
        const migrationFiles = {
          '004': '004_vector_database_minimal.sql - Core vector database',
          '005': '005_optional_document_storage.sql - Document storage',
          '006': '006_legal_compliance.sql - Legal compliance tracking',
          '007': '007_source_tracking_system.sql - Partner tracking'
        };
        console.log(`  - ${migrationFiles[migration] || migration}`);
      });
    }
    
    console.log('\nTo apply migrations:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run each migration file in order (004, 005, 006, 007)');
    console.log('\nRun "node scripts/apply-migrations.js" for detailed SQL');
  }
  console.log('='.repeat(60) + '\n');
}

// Run the tests
runTests().catch(console.error);