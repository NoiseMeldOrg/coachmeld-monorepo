#!/usr/bin/env node

/**
 * Script to help apply Supabase migrations
 * This script generates SQL commands that can be run in the Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

console.log('📋 RAG System Migration Helper\n');
console.log('This script will help you apply the necessary migrations for the RAG system.');
console.log('\nTo apply migrations:');
console.log('1. Go to your Supabase dashboard: https://app.supabase.com');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the migration content below');
console.log('5. Run the query\n');

// Check command line argument for specific migration
const specificMigration = process.argv[2];

// Define all migrations in order
const migrations = [
  {
    file: '005_optional_document_storage.sql',
    description: 'Document storage preferences and original file storage'
  },
  {
    file: '006_legal_compliance.sql',
    description: 'Legal compliance, disclaimers, and content flags'
  },
  {
    file: '007_source_tracking_system.sql',
    description: 'Partner agreements and source attribution tracking'
  }
];

if (specificMigration) {
  // Show specific migration
  const migration = migrations.find(m => m.file.includes(specificMigration));
  if (migration) {
    console.log(`📝 Migration: ${migration.file}`);
    console.log(`   ${migration.description}\n`);
    console.log('='.repeat(60));
    console.log('COPY THE FOLLOWING SQL TO YOUR SUPABASE SQL EDITOR:');
    console.log('='.repeat(60) + '\n');
    
    try {
      const migrationPath = path.join(migrationsDir, migration.file);
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      console.log(migrationContent);
      console.log('\n' + '='.repeat(60));
      console.log('END OF SQL CONTENT');
      console.log('='.repeat(60) + '\n');
    } catch (error) {
      console.error('❌ Error reading migration file:', error.message);
    }
  } else {
    console.error('❌ Migration not found:', specificMigration);
    console.log('\nAvailable migrations:');
    migrations.forEach(m => console.log(`  - ${m.file}`));
  }
} else {
  // Show all missing migrations
  console.log('❌ The following migrations need to be applied:\n');
  migrations.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration.file}`);
    console.log(`   ${migration.description}\n`);
  });
  
  console.log('To view a specific migration, run:');
  console.log('  node scripts/apply-migrations.js [migration_number]');
  console.log('\nExample:');
  console.log('  node scripts/apply-migrations.js 005');
  console.log('  node scripts/apply-migrations.js 006');
  console.log('  node scripts/apply-migrations.js 007');
  console.log('\n' + '='.repeat(60));
  console.log('IMPORTANT: Apply migrations in order (005, then 006, then 007)');
  console.log('='.repeat(60) + '\n');
}

console.log('✅ After running migrations, run: npm run test-rag');
console.log('   to verify all tables are created successfully.\n');