# Testing AI Coach Diet-Specific Knowledge

This guide helps you verify that each diet coach has access to their specific knowledge base and the shared PHD guidebook.

## 1. Command Line Testing

### Test All Coaches at Once
```bash
cd /home/intro/coach-meld-test/CoachMeld
node scripts/test-diet-coach-knowledge.js
```

This will test each coach with relevant queries and verify they can access:
- Their specific diet basics document
- The shared PHD guidebook

### Test Individual Coaches
```bash
# Test carnivore coach
node scripts/search-rag.js "carnivore diet benefits" --coach carnivore

# Test paleo coach  
node scripts/search-rag.js "paleo food list" --coach paleo

# Test keto coach
node scripts/search-rag.js "ketosis" --coach keto

# Test if all coaches can access PHD guidebook
node scripts/search-rag.js "proper human diet" --coach carnivore
node scripts/search-rag.js "proper human diet" --coach paleo
node scripts/search-rag.js "proper human diet" --coach keto
```

## 2. In-App Testing

### Test Questions for Each Diet Coach

#### Carnivore Coach
- "What foods can I eat on the carnivore diet?"
- "What are the benefits of a meat-based diet?"
- "How do I start the carnivore diet?"
- "Tell me about the proper human diet"

Expected: Should reference carnivore-specific foods (beef, lamb, etc.) and mention PHD principles

#### Paleo Coach
- "What is the paleo diet?"
- "Can I eat grains on paleo?"
- "What's the difference between paleo and primal?"
- "What does the proper human diet say about vegetables?"

Expected: Should mention hunter-gatherer principles, exclude grains/dairy, reference PHD

#### Keto Coach
- "How do I get into ketosis?"
- "What are keto macros?"
- "Can I eat fruit on keto?"
- "How does keto relate to the proper human diet?"

Expected: Should explain ketosis, macros (70% fat, 20% protein, 10% carbs), reference PHD

#### Ketovore Coach
- "What is the ketovore diet?"
- "How is ketovore different from carnivore?"
- "What plants can I eat on ketovore?"
- "Does the proper human diet support ketovore?"

Expected: Should explain the carnivore-keto hybrid approach, limited plants, PHD connection

#### Lion Diet Coach
- "What is the lion diet protocol?"
- "Why only ruminant meat and salt?"
- "How long should I do the lion diet?"
- "Is the lion diet part of the proper human diet?"

Expected: Should explain elimination protocol, beef/lamb/salt only, reference PHD

## 3. Verifying Results

### What to Look For:
1. **Diet-Specific Accuracy**: Each coach should provide information specific to their diet
2. **No Cross-Contamination**: Carnivore coach shouldn't suggest vegetables, Paleo shouldn't mention ketosis
3. **PHD Access**: All coaches should reference PHD principles when asked
4. **Consistent Quality**: All coaches should provide similar depth of knowledge

### Current Limitations:
The app currently uses mock responses in `src/utils/aiCoach.ts`. To enable RAG:

1. The aiCoach.ts needs to be updated to:
   - Generate embeddings for user queries
   - Search the RAG system
   - Use retrieved context to generate responses
   - Integrate with Gemini API for actual AI responses

2. Required changes:
   - Add Supabase client to aiCoach.ts
   - Add embedding generation for queries
   - Call search_coach_documents function
   - Pass retrieved context to AI model

## 4. Quick Verification Commands

```bash
# Count documents per coach
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function count() {
  const coaches = ['carnivore', 'carnivore-pro', 'paleo', 'lowcarb', 'keto', 'ketovore', 'lion'];
  for (const coach of coaches) {
    const { count } = await supabase
      .from('coach_document_access')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coach);
    console.log(`${coach}: ${count} documents`);
  }
}
count();
"
```

## Next Steps

To fully enable RAG-powered responses:
1. Update aiCoach.ts to use the RAG system
2. Integrate Gemini API for natural language generation
3. Add caching for frequently asked questions
4. Monitor response quality and adjust similarity thresholds