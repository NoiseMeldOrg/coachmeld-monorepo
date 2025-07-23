# Gemini AI Integration Guide

**Last Updated:** 2025-06-21  
**Status:** Implemented

## Overview

CoachMeld uses Google's Gemini AI to power intelligent coach responses. The integration combines:
- **Gemini 1.5 Flash** for fast, cost-effective chat completions
- **RAG system** for context-aware responses
- **Supabase Edge Functions** for secure API access

## Architecture

```
User Message → ChatScreen → RAGCoachService → GeminiChatService → Edge Function → Gemini API
                                ↓
                         RAG System (Context)
```

## Current Implementation

### 1. Edge Function (`chat-completion`)
- Located at: `supabase/functions/chat-completion/index.ts`
- Model: `gemini-1.5-flash`
- Handles authentication and rate limiting
- Returns response with token usage metrics

### 2. Client Service (`GeminiChatService`)
- Located at: `src/services/geminiChatService.ts`
- Manages authentication tokens
- Provides error handling and fallbacks
- Checks API availability

### 3. Coach Integration (`RAGCoachService`)
- Uses Gemini for all diet coach responses
- Falls back to templates if API unavailable
- Combines multiple contexts:
  - System prompt (coach personality)
  - User context (profile data)
  - Knowledge context (RAG results)
  - Conversation context (chat history)

## Setup

### 1. Environment Variables

Add to `.env`:
```bash
GEMINI_API_KEY=your-gemini-api-key
```

Get your API key from: https://makersuite.google.com/app/apikey

### 2. Deploy Edge Functions

```bash
supabase functions deploy chat-completion
```

### 3. Test Integration

```bash
npm run test-gemini-chat
```

## Usage

### Basic Chat Response

```typescript
import { GeminiChatService } from '../services/geminiChatService';

const response = await GeminiChatService.generateResponse(
  'What should I eat for breakfast?',
  {
    systemPrompt: 'You are a Carnivore Coach...',
    userContext: 'User prefers beef...',
    knowledgeContext: 'RAG documents suggest...'
  },
  {
    temperature: 0.7,
    maxOutputTokens: 1024
  }
);
```

### With RAG Context

The system automatically:
1. Searches vector database for relevant documents
2. Extracts key information
3. Formats context for Gemini
4. Generates contextual response

## Current System Prompt

```
You are a [Diet] Coach, an AI health advisor specializing in the [diet] diet and lifestyle.

Core approach: [Core principles from knowledge base]

Your role is to provide evidence-based advice specific to the [diet] approach.
You should be supportive, informative, and tailor responses to the user's specific health goals.
Always start your response by acknowledging or paraphrasing the user's question.
Base your responses on the knowledge provided from the RAG system and your training.
```

## Cost Analysis

### Gemini 1.5 Flash Pricing
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

### Typical Usage
- Average query: ~2,000 input tokens, ~500 output tokens
- Cost per query: ~$0.00015 + $0.00015 = $0.0003
- 1,000 queries = $0.30

## Error Handling

The system handles several error cases:

1. **No Authentication**: Falls back to template responses
2. **Rate Limiting**: Shows user-friendly message
3. **API Quota**: Graceful degradation
4. **Network Issues**: Uses cached responses

## Testing

### Manual Testing
1. Open the app
2. Select a diet coach (e.g., Carnivore Coach)
3. Ask a question
4. Verify response is contextual and intelligent

### Automated Testing
```bash
npm run test-gemini-chat
```

This tests:
- Basic completion
- RAG context integration
- Error handling
- Token usage tracking

## Monitoring

### Check Logs
```bash
supabase functions logs chat-completion
```

### Token Usage
Each response includes token counts:
```json
{
  "response": "...",
  "usage": {
    "promptTokens": 1523,
    "completionTokens": 487,
    "totalTokens": 2010
  }
}
```

## Future Enhancements

1. **Streaming Responses**: Show text as it's generated
2. **Better Prompts**: See `RAG_ENHANCEMENT_OPTIONS.md`
3. **Multi-turn Context**: Improve conversation memory
4. **Fine-tuning**: Custom model for each coach type

## Troubleshooting

### "Gemini API not available"
1. Check API key in environment
2. Verify Edge Function is deployed
3. Check Supabase logs for errors

### Slow Responses
1. Gemini 1.5 Flash is optimized for speed
2. Check document retrieval time
3. Consider reducing max tokens

### Generic Responses
1. Verify RAG system is returning documents
2. Check knowledge context is being passed
3. Review system prompt quality

## Security

- API keys stored in Edge Function environment
- User authentication required for all requests
- No sensitive data in prompts
- Rate limiting prevents abuse