#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoachesTable() {
  console.log('Checking if coaches table exists...\n');
  
  try {
    // Try to query the coaches table
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation "public.coaches" does not exist')) {
        console.log('❌ Coaches table does NOT exist');
        console.log('   Migration 002 has not been applied yet');
        console.log('   No need for a removal migration!');
      } else {
        console.log('❌ Error accessing coaches table:', error.message);
      }
    } else {
      console.log('✅ Coaches table EXISTS');
      console.log('   Migration 002 has already been applied');
      
      // Check if webhook_url column exists
      const { data: columns, error: columnError } = await supabase.rpc(
        'get_table_columns',
        { table_name: 'coaches' }
      ).catch(() => ({ data: null, error: 'Function not found' }));
      
      if (!columnError && columns) {
        const hasWebhookColumn = columns.some(col => col.column_name === 'n8n_webhook_url');
        if (hasWebhookColumn) {
          console.log('   ⚠️  webhook_url column EXISTS');
          console.log('   You need a migration to remove it!');
        } else {
          console.log('   ✅ webhook_url column does NOT exist');
        }
      } else {
        console.log('   Could not check column existence');
        console.log('   You may need to check manually in Supabase');
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkCoachesTable();