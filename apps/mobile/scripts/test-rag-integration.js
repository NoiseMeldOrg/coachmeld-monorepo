#!/usr/bin/env node

/**
 * Test the RAG integration for diet coaches
 */

const { RAGCoachService } = require('../src/services/coaches/ragCoachService');

async function testRAGIntegration() {
  console.log('🧪 Testing RAG Integration for Diet Coaches\n');
  
  const testCases = [
    {
      coachId: 'carnivore',
      message: 'What foods can I eat on the carnivore diet?',
      expectedKeywords: ['meat', 'beef', 'animal']
    },
    {
      coachId: 'paleo', 
      message: 'What is the paleo diet?',
      expectedKeywords: ['ancestral', 'whole foods', 'grains']
    },
    {
      coachId: 'keto',
      message: 'How do I get into ketosis?',
      expectedKeywords: ['carb', 'fat', 'ketone']
    },
    {
      coachId: 'carnivore',
      message: 'Tell me about the proper human diet',
      expectedKeywords: ['PHD', 'proper', 'human']
    }
  ];

  for (const test of testCases) {
    console.log(`\n📋 Testing ${test.coachId} coach`);
    console.log(`❓ Question: "${test.message}"`);
    
    try {
      const ragService = new RAGCoachService(test.coachId);
      const response = await ragService.processMessage(test.message);
      
      console.log(`✅ Response received (${response.length} chars)`);
      console.log(`📝 Preview: ${response.substring(0, 200)}...`);
      
      // Check if response contains expected keywords
      const hasKeywords = test.expectedKeywords.some(keyword => 
        response.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasKeywords) {
        console.log('✅ Response contains expected content');
      } else {
        console.log('⚠️  Response may not be using RAG knowledge');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ RAG integration test complete!');
}

// Run the test
testRAGIntegration().catch(console.error);