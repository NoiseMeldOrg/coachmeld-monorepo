#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEdgeFunction() {
  console.log('🔍 Checking Edge Function Status...\n');

  try {
    // List deployed functions
    console.log('📋 Deployed Functions:');
    const functionsResponse = await fetch(
      `${supabaseUrl}/functions/v1/`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        }
      }
    );
    
    if (functionsResponse.ok) {
      const functions = await functionsResponse.text();
      console.log('Functions endpoint response:', functions);
    } else {
      console.log('Could not list functions:', functionsResponse.status);
    }

    // Test chat-completion function directly
    console.log('\n🧪 Testing chat-completion function directly...');
    
    // Create test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'edge-test@example.com',
      password: 'test-password-123',
      email_confirm: true
    });

    if (authError && !authError.message.includes('already been registered')) {
      throw authError;
    }

    // Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'edge-test@example.com',
      password: 'test-password-123'
    });

    if (signInError) {
      throw signInError;
    }

    // Test the function
    const testPayload = {
      prompt: 'Hello, are you working?',
      systemPrompt: 'You are a helpful assistant. Respond with a simple confirmation.',
      temperature: 0.5,
      maxOutputTokens: 50
    };

    console.log('\nSending test request to edge function...');
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: testPayload,
      headers: {
        Authorization: `Bearer ${signInData.session.access_token}`
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Edge function response:', data);
    }

    // Check secrets
    console.log('\n🔑 Checking if GEMINI_API_KEY is set...');
    console.log('Note: We cannot view the actual secret value for security reasons');
    console.log('But if the edge function works, the secret is properly set');

    // Clean up
    await supabase.auth.admin.deleteUser(authData?.user?.id || signInData.user.id);

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkEdgeFunction().then(() => {
  console.log('\n✨ Edge function check complete!');
  console.log('\nIf you see an error above, please:');
  console.log('1. Ensure the edge function is deployed: npx supabase functions deploy chat-completion');
  console.log('2. Ensure the secret is set: npx supabase secrets set GEMINI_API_KEY=your-key');
  console.log('3. Check the function logs: npx supabase functions logs chat-completion');
});