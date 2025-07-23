# Context Cache Analysis for CoachMeld

## What Would Be Cached

### 1. System Prompt (~150-200 tokens)

**Default System Prompt Template:**
```
You are a [Diet Name] Coach, an AI health advisor specializing in the [diet name] diet.

Your responses should be:
- Concise and to the point (2-3 short paragraphs max)
- Focused on practical, actionable advice
- Specific to the [diet name] approach

Start with a brief acknowledgment of the question, then provide clear, helpful guidance.
Keep your response conversational and friendly, like texting with a knowledgeable friend.
Base your responses on the knowledge provided from the RAG system and your training.
```

**Token Estimate:** ~150 tokens (varies by coach type)

### 2. User Profile Context (~100-150 tokens)

**Typical User Profile:**
```
User Profile:
- Name: Sarah Johnson
- Age: 35
- Gender: female
- Height: 5' 6"
- Weight: 165 lbs
- Activity Level: moderately active
- Health Goals: weight loss, improve energy, reduce inflammation
- Dietary Preferences: no dairy, prefers beef over chicken
- Health Conditions: pre-diabetes, mild arthritis
```

**Token Estimate:** ~100-150 tokens (depends on number of goals/conditions)

### 3. Conversation Memory Context (~200-500 tokens)

**Previous Conversation Summary:** (~100-200 tokens)
```
Previous Conversation Summary: User has been following carnivore diet for 2 weeks. 
Initially experienced fatigue but energy is improving. Lost 4 pounds. Struggling 
with electrolyte balance. Enjoys ribeye steaks and ground beef. Concerned about 
social situations and eating out.
```

**Known Facts About User:** (~50-100 tokens)
```
Known Facts About User:
- Started carnivore diet on March 1st
- Current weight: 165 lbs (down from 169)
- Prefers beef over other meats
- Works out 3x per week
- Has pre-diabetes diagnosis
```

**Previously Discussed Topics:** (~20-30 tokens)
```
Previously Discussed Topics: diet basics, electrolytes, meal planning, 
weight loss, eating out, supplements
```

### 4. Coach-Specific Context (~50-100 tokens)

**Coach Configuration:**
```
Coach: Carnivore Coach
Diet Type: carnivore
Specialties: weight loss, metabolic health, autoimmune support
Response Style: supportive, evidence-based, practical
```

## Total Cached Context Estimate

| Component | Token Count |
|-----------|------------|
| System Prompt | 150-200 |
| User Profile | 100-150 |
| Conversation Summary | 100-200 |
| Known Facts | 50-100 |
| Previous Topics | 20-30 |
| Coach Config | 50-100 |
| **TOTAL** | **470-780 tokens** |

## What Would NOT Be Cached

These elements change with each query and cannot be cached:

1. **Current User Message** (10-50 tokens)
2. **RAG Search Results** (400-800 tokens) - Dynamic based on query
3. **Recent Messages** (200-500 tokens) - Last 5-10 messages
4. **Current Timestamp** - If needed for context

## Optimal Caching Strategy

### Cache Configuration
```typescript
interface CachedContext {
  // Static for the session (cache for 1-24 hours)
  systemPrompt: string;           // 150-200 tokens
  userProfile: string;            // 100-150 tokens
  coachConfig: string;            // 50-100 tokens
  
  // Semi-dynamic (cache for 15-60 minutes)
  conversationSummary: string;    // 100-200 tokens
  knownFacts: string[];          // 50-100 tokens
  previousTopics: string[];      // 20-30 tokens
}
```

### Benefits of Caching This Context

1. **Cost Savings**: 
   - Input tokens: ~600 cached tokens × $0.075/1M = $0.000045 saved per request
   - With cache discount (75% off): $0.000034 actual savings
   - At 1000 requests/day = $34/month savings

2. **Performance**:
   - Reduced prompt assembly time
   - Faster response generation
   - Lower latency for users

3. **Consistency**:
   - Same coach personality across conversations
   - Consistent user context interpretation

### Implementation Example

```typescript
class ContextCacheManager {
  private static CACHE_DURATION = {
    STATIC: 24 * 60 * 60 * 1000,  // 24 hours
    PROFILE: 60 * 60 * 1000,       // 1 hour
    CONVERSATION: 15 * 60 * 1000   // 15 minutes
  };

  async getCachedContext(userId: string, coachId: string): Promise<CachedContext> {
    const cacheKey = `context_${userId}_${coachId}`;
    
    // Check for existing cache
    const cached = await this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.context;
    }
    
    // Build new cached context
    const context = {
      systemPrompt: await this.getSystemPrompt(coachId),
      userProfile: await this.getUserProfile(userId),
      coachConfig: await this.getCoachConfig(coachId),
      conversationSummary: await this.getConversationSummary(userId, coachId),
      knownFacts: await this.getKnownFacts(userId),
      previousTopics: await this.getPreviousTopics(userId, coachId)
    };
    
    // Cache it
    await this.cache.set(cacheKey, {
      context,
      timestamp: Date.now(),
      expiry: Date.now() + this.CACHE_DURATION.PROFILE
    });
    
    return context;
  }
}
```

## Recommendations

1. **Start Simple**: Cache system prompt + user profile (250-350 tokens)
2. **Monitor Usage**: Track cache hit rates and token savings
3. **Expand Gradually**: Add conversation context if beneficial
4. **Update Strategy**: 
   - User profile: Update on profile changes
   - Conversation: Update every 20 messages
   - System prompt: Update on coach configuration changes

## Current Token Usage and Costs

### Token Breakdown Per Message (Without Caching)

#### Input Tokens
- **System Prompt**: ~150-200 tokens
- **User Profile**: ~100-150 tokens  
- **Conversation Context**: ~200-500 tokens
- **RAG Search Results**: ~400-800 tokens
- **User Message**: ~10-50 tokens
- **Total Input**: **~860-1,700 tokens** (average ~1,280)

#### Output Tokens
- **Typical Response**: ~150-300 tokens (2-3 paragraphs as configured)

### Gemini 1.5 Flash Pricing
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens

### Cost Per Message

#### Without Context Caching:
```
Input:  1,280 tokens × $0.075/1M = $0.000096
Output:   225 tokens × $0.30/1M  = $0.000068
Total per message:                  $0.000164
```

#### With Context Caching (600 cached tokens):
```
Cached:   600 tokens × $0.01875/1M = $0.000011 (75% discount)
Fresh:    680 tokens × $0.075/1M   = $0.000051
Output:   225 tokens × $0.30/1M    = $0.000068
Total per message:                   $0.000130
```

**Savings per message: $0.000034 (21% reduction)**

## Cost-Benefit Analysis

### Monthly Cost Comparison

| Daily Messages | Monthly Cost (No Cache) | Monthly Cost (Cached) | Monthly Savings |
|----------------|------------------------|---------------------|-----------------|
| 100 | $4.92 | $3.90 | $1.02 (21%) |
| 500 | $24.60 | $19.50 | $5.10 (21%) |
| 1,000 | $49.20 | $39.00 | $10.20 (21%) |
| 5,000 | $246.00 | $195.00 | $51.00 (21%) |
| 10,000 | $492.00 | $390.00 | $102.00 (21%) |

### Per User Cost Analysis
Assuming average user sends 10 messages per day:
- **Without caching**: $0.49 per user per month
- **With caching**: $0.39 per user per month  
- **Savings**: $0.10 per user per month

### Break-even Analysis
- **Implementation time**: ~4-8 hours
- **Break-even point**:
  - At 100 messages/day: ~4 months
  - At 500 messages/day: ~1 month
  - At 1,000+ messages/day: <2 weeks

## Recommendations Based on Usage

### Current Stage (< 500 messages/day)
- **Focus on**: Product development and user acquisition
- **Context caching**: Not urgent, costs are negligible (<$25/month)
- **Monitor**: Token usage patterns for future optimization

### Growth Stage (500-5,000 messages/day)
- **Implement**: Basic caching (system prompt + user profile)
- **Expected savings**: $5-50/month
- **Benefit**: Sets foundation for scale

### Scale Stage (5,000+ messages/day)
- **Full implementation**: All cacheable context
- **Expected savings**: $50-100+/month
- **Additional benefits**: Improved response times, better user experience

### Key Insight
At **$0.000164 per message** without caching, the cost is already very low. Context caching becomes financially meaningful at scale (1,000+ daily messages) but provides performance benefits at any scale.