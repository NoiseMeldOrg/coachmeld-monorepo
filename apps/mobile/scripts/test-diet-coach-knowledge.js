#!/usr/bin/env node

/**
 * Test that each diet coach has access to their specific knowledge
 */

const { searchDocuments } = require('./search-rag');

// Test queries for different diet types
const testQueries = {
  carnivore: [
    "what is the carnivore diet",
    "carnivore diet benefits", 
    "meat-based nutrition",
    "proper human diet"
  ],
  paleo: [
    "what is paleo diet",
    "paleo food list",
    "hunter-gatherer diet",
    "proper human diet"
  ],
  lowcarb: [
    "low carb diet basics",
    "carbohydrate restriction",
    "low carb benefits",
    "proper human diet"
  ],
  keto: [
    "ketogenic diet",
    "ketosis",
    "keto macros",
    "proper human diet"
  ],
  ketovore: [
    "ketovore diet",
    "carnivore keto combination",
    "ketovore approach",
    "proper human diet"
  ],
  lion: [
    "lion diet protocol",
    "elimination diet",
    "ruminant meat",
    "proper human diet"
  ]
};

const dietCoaches = ['carnivore', 'carnivore-pro', 'paleo', 'lowcarb', 'keto', 'ketovore', 'lion'];

async function testCoachKnowledge() {
  console.log('🧪 Testing Diet Coach Knowledge Base Access\n');
  console.log('=' * 60);
  
  for (const coach of dietCoaches) {
    console.log(`\n\n🥩 Testing ${coach.toUpperCase()} coach`);
    console.log('-'.repeat(40));
    
    const dietType = coach === 'carnivore-pro' ? 'carnivore' : coach;
    const queries = testQueries[dietType] || [];
    
    for (const query of queries) {
      try {
        console.log(`\n📝 Query: "${query}"`);
        
        const results = await searchDocuments(query, {
          coach: coach,
          limit: 3,
          threshold: 0.6
        });
        
        if (results.length > 0) {
          console.log(`✅ Found ${results.length} results`);
          
          // Check if results include diet-specific content
          const hasDietSpecific = results.some(r => 
            r.title.toLowerCase().includes(dietType) || 
            r.content.toLowerCase().includes(dietType)
          );
          
          // Check if PHD guidebook is accessible
          const hasPHD = results.some(r => 
            r.title.toLowerCase().includes('phd') || 
            r.title.toLowerCase().includes('proper human diet')
          );
          
          if (query.includes('proper human diet') && hasPHD) {
            console.log('   ✅ PHD Guidebook accessible');
          } else if (hasDietSpecific) {
            console.log('   ✅ Diet-specific content found');
          }
          
          // Show top result
          console.log(`   Top result: ${results[0].title} (${(results[0].similarity_score * 100).toFixed(1)}%)`);
        } else {
          console.log('❌ No results found');
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ Knowledge base test complete!\n');
}

// Run the test
if (require.main === module) {
  testCoachKnowledge().catch(console.error);
}