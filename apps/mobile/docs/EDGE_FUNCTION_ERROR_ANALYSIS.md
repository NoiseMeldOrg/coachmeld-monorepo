# Edge Function Error Analysis

## Summary
The CoachMeld app is experiencing Edge Function errors that appear after successful AI responses. While the main chat functionality works, background processes are failing.

## Observed Behavior

### What's Working ✅
1. AI chat responses are generated successfully
2. Messages are being sent and received
3. Gemini API key is valid and functional
4. Model `gemini-1.5-flash` is correctly configured

### What's Failing ❌
1. Edge Functions show repeated shutdown/restart cycles
2. "Edge Function returned a non-2xx status code" errors after responses
3. Background processes fail after main chat response

## Root Cause Analysis

### 1. Edge Function Lifecycle (Normal Behavior)
```
booted (time: 22ms) → shutdown
```
This pattern is **normal** for Supabase Edge Functions:
- Functions boot on-demand (cold start)
- Shutdown immediately after request completion
- This saves resources in serverless architecture

### 2. Post-Response Background Failures
After sending a chat response, the app attempts several background operations:

#### a) User Context Document Updates
```typescript
// From ProgressChatScreen.tsx and ChatScreen.tsx
userContextService.current.updateUserContextDocument(
  user.id,
  userProfile,
  allMessages
)
```
**Potential Issues:**
- Missing `generate-embedding` Edge Function
- Edge Function not deployed properly
- Timeout issues when generating embeddings
- Missing environment variables for embedding service

#### b) Conversation Memory Updates
```typescript
ConversationMemoryService.updateConversationMemory(
  user.id,
  activeCoach.id,
  allMessages
)
```
**Potential Issues:**
- Database permission issues
- Missing tables or columns
- RLS policies blocking updates
- Circular dependencies in update logic

### 3. Specific Error Patterns

#### Pattern 1: Immediate Shutdown
- **Symptom**: Function shuts down within 22ms
- **Likely Cause**: Missing environment variables or immediate validation failure
- **Not the main issue** since chat responses work

#### Pattern 2: Post-Success Failure
- **Symptom**: Chat works, but error appears after
- **Likely Cause**: Background service failures
- **Impact**: Non-critical - doesn't affect user experience

## Detailed Issue Breakdown

### 1. Embedding Generation Service
**Location**: `userContextService.ts` → `embeddingService.ts`

**What it does**:
- Generates embeddings for user profile/conversation
- Stores in `coach_documents` with `source_type = 'user_context'`

**Potential failures**:
- `generate-embedding` Edge Function missing or misconfigured
- Gemini embedding API rate limits
- Vector dimension mismatch (expecting 768)
- Database write permissions

### 2. Conversation Memory Service
**Location**: `conversationMemoryService.ts`

**What it does**:
- Creates conversation summaries after 20 messages
- Extracts key facts from conversations
- Updates user memories

**Potential failures**:
- Missing `conversation_summaries` table
- Missing `user_memories` table
- RLS policies preventing writes
- Gemini API calls for summarization failing

### 3. Edge Function Configuration Issues
**Possible problems**:
- Functions not deployed: `generate-embedding`, `summarize-conversation`
- Missing environment variables in Edge Functions
- Incorrect function URLs in service calls
- CORS configuration issues

## Verification Steps

### 1. Check Deployed Edge Functions
```bash
supabase functions list
```
Verify these exist:
- `chat-completion` ✓ (working)
- `generate-embedding` ❓
- `summarize-conversation` ❓

### 2. Check Database Tables
```sql
-- Verify these tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'conversation_summaries',
  'user_memories',
  'conversation_topics'
);
```

### 3. Check Edge Function Logs
In Supabase Dashboard → Edge Functions:
- Look for `generate-embedding` function logs
- Check for specific error messages
- Verify function invocation attempts

### 4. Test Embedding Service
```typescript
// Quick test to see if embedding generation works
const testEmbedding = await embeddingService.embedQuery("test");
console.log("Embedding length:", testEmbedding.length); // Should be 768
```

## Solutions

### Quick Fix (Disable Background Services)
Comment out these lines in both `ChatScreen.tsx` and `ProgressChatScreen.tsx`:

```typescript
// Temporarily disable to stop errors
/*
userContextService.current.updateUserContextDocument(
  user.id,
  userProfile,
  allMessages
).catch(error => {
  console.error('Failed to update user context:', error);
});

ConversationMemoryService.updateConversationMemory(
  user.id,
  activeCoach.id,
  allMessages
).catch(error => {
  console.error('Failed to update conversation memory:', error);
});
*/
```

### Proper Fix Options

#### Option 1: Deploy Missing Edge Functions
```bash
# If generate-embedding function exists in project
supabase functions deploy generate-embedding

# If summarize function exists
supabase functions deploy summarize-conversation
```

#### Option 2: Create Fallback Logic
Modify services to handle Edge Function failures gracefully:
```typescript
// In embeddingService.ts
async embedQuery(text: string): Promise<number[]> {
  try {
    // Try Edge Function
    return await this.callEdgeFunction(text);
  } catch (error) {
    // Return mock embedding on failure
    console.warn('Embedding service failed, using mock');
    return new Array(768).fill(0);
  }
}
```

#### Option 3: Use Direct API Calls
Instead of Edge Functions, call Gemini API directly from services:
```typescript
// Direct API call instead of Edge Function
const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: { parts: [{ text }] } })
});
```

## Impact Assessment

### User Impact: LOW
- Main chat functionality works perfectly
- These are enhancement features that fail silently
- No data loss or corruption

### Technical Impact: MEDIUM
- Accumulating error logs
- Missing optimization features
- Potential for future issues if not addressed

### Business Impact: LOW
- User experience is not affected
- Chat responses are successful
- Only advanced features (conversation memory, context) are impacted

## Recommendations

1. **Short term**: Disable the failing background services
2. **Medium term**: Properly deploy and configure missing Edge Functions
3. **Long term**: Implement proper error handling and fallback mechanisms

## Monitoring
Add logging to identify exactly which service is failing:
```typescript
console.log('[UserContext] Starting update...');
// ... service call ...
console.log('[UserContext] Update complete');

console.log('[ConversationMemory] Starting update...');
// ... service call ...
console.log('[ConversationMemory] Update complete');
```

This will help pinpoint which background service is causing the Edge Function errors.