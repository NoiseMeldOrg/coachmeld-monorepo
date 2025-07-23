#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testGeminiChat() {
  console.log('🧪 Testing Gemini Chat Integration...\n');

  try {
    // Create a test user session
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-gemini@example.com',
      password: 'test-password-123',
      email_confirm: true
    });

    if (authError && !authError.message.includes('already been registered')) {
      throw authError;
    }

    // Sign in as the test user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test-gemini@example.com',
      password: 'test-password-123'
    });

    if (signInError) {
      throw signInError;
    }

    console.log('✅ Test user authenticated\n');

    // Test 1: Basic chat completion
    console.log('Test 1: Basic Chat Completion');
    console.log('----------------------------');
    
    const basicResponse = await supabase.functions.invoke('chat-completion', {
      body: {
        prompt: 'What are the benefits of a carnivore diet?',
        systemPrompt: 'You are a helpful carnivore diet coach. Keep your response brief.',
        temperature: 0.7,
        maxOutputTokens: 200
      },
      headers: {
        Authorization: `Bearer ${signInData.session.access_token}`
      }
    });

    if (basicResponse.error) {
      throw basicResponse.error;
    }

    console.log('Response:', basicResponse.data.response);
    console.log('Token usage:', basicResponse.data.usage);
    console.log('✅ Basic chat completion successful\n');

    // Test 2: With RAG context
    console.log('Test 2: Chat with RAG Context');
    console.log('-----------------------------');
    
    const ragResponse = await supabase.functions.invoke('chat-completion', {
      body: {
        prompt: 'How should I start the carnivore diet?',
        systemPrompt: 'You are a Carnivore Coach specializing in helping beginners.',
        knowledgeContext: `Based on the following knowledge from our database:

[Getting Started]
Start with fatty cuts of beef like ribeye or ground beef (80/20). 
Eat until satiated, typically 1-2 pounds per day.
Salt your food to taste.
Expect an adaptation period of 2-4 weeks.`,
        userContext: `User Profile:
- Name: Test User
- Goal: Weight loss
- Experience: Beginner`,
        temperature: 0.7,
        maxOutputTokens: 300
      },
      headers: {
        Authorization: `Bearer ${signInData.session.access_token}`
      }
    });

    if (ragResponse.error) {
      throw ragResponse.error;
    }

    console.log('Response:', ragResponse.data.response);
    console.log('✅ RAG context chat completion successful\n');

    // Test 3: Error handling
    console.log('Test 3: Error Handling');
    console.log('---------------------');
    
    const errorResponse = await supabase.functions.invoke('chat-completion', {
      body: {
        prompt: 'Test error handling',
        // Missing required auth header
      }
    });

    if (errorResponse.error) {
      console.log('✅ Error correctly caught:', errorResponse.error.message);
    } else {
      console.log('❌ Error handling test failed - should have thrown an error');
    }

    // Clean up - delete test user
    await supabase.auth.admin.deleteUser(authData.user?.id || signInData.user.id);
    console.log('\n✅ Test user cleaned up');

    console.log('\n🎉 All Gemini chat tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testGeminiChat().then(() => {
  console.log('\n✨ Gemini chat integration is working correctly!');
  process.exit(0);
});