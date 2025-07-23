# RAG Integration for Diet Coaches

This document explains how the RAG (Retrieval-Augmented Generation) system is integrated with the diet coaches in CoachMeld.

## Overview

All diet coaches now use the RAG system to provide knowledge-based responses:
- Carnivore Coach (free & pro)
- Paleo Coach
- Low Carb Coach
- Keto Coach
- Ketovore Coach
- Lion Diet Coach

## Architecture

### 1. RAGService (`src/services/ragService.ts`)
- Handles communication with Supabase vector database
- Generates embeddings for user queries (mock for now, Gemini API in production)
- Searches for relevant documents using vector similarity
- Extracts relevant information from retrieved documents

### 2. RAGCoachService (`src/services/coaches/ragCoachService.ts`)
- Extends coach responses with RAG knowledge
- Diet-specific response generation
- Integrates user profile context
- Fallback responses when no relevant knowledge found

### 3. ChatScreen Integration
The ChatScreen now routes messages:
```typescript
if (isDietCoach) {
  // Use RAG for all diet coaches
  const ragCoachService = new RAGCoachService(activeCoach.id);
  coachResponse = await ragCoachService.processMessage(text, { userProfile });
}
```

## How It Works

1. **User sends message** → ChatScreen receives it
2. **Coach type check** → Determines if it's a diet coach
3. **RAG search** → Queries vector database for relevant documents
4. **Context building** → Combines:
   - Retrieved documents
   - User profile
   - Coach-specific context
5. **Response generation** → Creates diet-specific response using knowledge

## Knowledge Base Content

Each diet coach has access to:
- **Diet-specific basics document** (e.g., carnivore-basics.md)
- **Shared PHD guidebook** (accessible by all diet coaches)
- **Future additions** via the shared document system

## Current Limitations

1. **Mock embeddings**: Currently generates random embeddings
   - Production will use Gemini embedding API
   
2. **Template responses**: Uses template-based responses with RAG context
   - Production will use Gemini API for natural language generation

3. **No conversation memory**: Each query is independent
   - Future: Add conversation context to embeddings

## Testing

### In-App Testing
1. Select a diet coach
2. Ask diet-specific questions
3. Verify responses use appropriate knowledge

### Command Line Testing
```bash
# Test all diet coaches
node scripts/test-diet-coach-knowledge.js

# Test RAG integration
node scripts/test-rag-integration.js

# Search specific coach knowledge
node scripts/search-rag.js "carnivore benefits" --coach carnivore
```

## Next Steps

1. **Implement Gemini Embeddings**
   - Replace mock embeddings with actual API calls
   - Use text-embedding-004 model

2. **Add Gemini Chat API**
   - Replace template responses with AI generation
   - Use gemini-1.5-flash for responses

3. **Conversation Memory**
   - Include recent messages in context
   - Maintain conversation coherence

4. **Performance Optimization**
   - Cache frequent queries
   - Implement embedding similarity threshold tuning

## Environment Variables

Required for production:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

## Troubleshooting

### "No results found" errors
- Check if documents are uploaded to RAG system
- Verify coach_document_access table has entries
- Lower similarity threshold in search

### Generic responses
- RAG system may not have found relevant documents
- Check if embeddings are being generated
- Verify search_coach_documents function works

### Coach not using RAG
- Ensure coach ID is in dietCoaches array
- Check ChatScreen routing logic
- Verify RAGCoachService initialization