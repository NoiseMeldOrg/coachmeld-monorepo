# RAG System Enhancement Options

**Document Version:** 1.0.0  
**Created:** 2025-06-21  
**Status:** For Consideration

## Overview

This document outlines potential enhancements to the CoachMeld RAG (Retrieval-Augmented Generation) system. These are options to consider after initial testing and user feedback.

## Current System Limitations

1. **Fixed 3-document retrieval limit**
2. **Basic keyword matching for relevance**
3. **No source citation in responses**
4. **Template-based fallback responses**
5. **No contradiction detection**
6. **No temporal awareness**
7. **No confidence scoring**

## Enhancement Options

### 1. Dynamic Document Retrieval

**Current:** Hardcoded limit of 3 documents per query

**Option A: Query Complexity-Based Limits**
```typescript
const determineDocumentLimit = (query: string): number => {
  const queryLength = query.split(' ').length;
  const complexityIndicators = ['how', 'why', 'compare', 'versus', 'and', 'difference', 'between'];
  const hasComplexity = complexityIndicators.some(word => 
    query.toLowerCase().includes(word)
  );
  
  // Complex queries get more documents
  if (queryLength > 15 || hasComplexity) return 5;
  if (queryLength > 8) return 4;
  return 3; // Simple queries stay at 3
};
```

**Option B: Similarity Score-Based Filtering**
```typescript
// Retrieve more initially, filter by quality
const documents = await this.ragService.searchDocuments(message, {
  coachId: this.coachContext.coachId,
  limit: 10, // Retrieve more
  threshold: 0.6
});

// Keep only high-quality matches
const relevantDocs = documents
  .filter(doc => doc.similarity_score > 0.75)
  .slice(0, 5);
```

**Option C: Coach-Specific Limits**
```typescript
const coachDocLimits = {
  'carnivore': 3,      // Focused diet, fewer docs needed
  'fitness': 5,        // Multiple exercise types
  'mindfulness': 4,    // Various techniques
  'finance': 6,        // Complex calculations
  'relationships': 5   // Multiple perspectives
};
```

### 2. Enhanced System Prompts

**Current:** Basic coach introduction and role definition

**Option: Advanced RAG-Aware Prompt**
```typescript
const enhancedSystemPrompt = `You are an intelligent ${coachName} coach with access to a curated knowledge base.

### Core Instructions:
1. Base answers ONLY on retrieved documents and your training
2. If information conflicts, present multiple viewpoints
3. Acknowledge when information might be outdated
4. Cite sources when making specific claims

### Response Guidelines:
- Multi-hop reasoning: Connect information from multiple sources when needed
- Contradiction handling: Note "According to [Source A]... while [Source B] suggests..."
- Temporal awareness: Note "As of [date]..." for time-sensitive information
- Confidence levels: Use phrases like "Based on strong evidence..." or "Limited information suggests..."

### Constraints:
- Never invent facts not in the knowledge base
- If unsure, say "I don't have specific information about that"
- Always maintain coach personality while being accurate

### Output Structure:
1. Acknowledge the user's question
2. Provide the main answer
3. Include relevant caveats or additional context
4. Suggest follow-up questions if appropriate`;
```

### 3. Source Citation System

**Option A: Inline Citations**
```typescript
// Add to response generation
const formatResponseWithSources = (answer: string, sources: RAGDocument[]): string => {
  let citedAnswer = answer;
  sources.forEach((source, index) => {
    const sourceRef = `[${index + 1}]`;
    // Add citations after relevant statements
    citedAnswer = citedAnswer.replace(
      new RegExp(`(${source.content.substring(0, 50)}.*?)(\.)`, 'g'),
      `$1${sourceRef}$2`
    );
  });
  
  // Add source list at end
  citedAnswer += '\n\nSources:\n';
  sources.forEach((source, index) => {
    citedAnswer += `[${index + 1}] ${source.title}\n`;
  });
  
  return citedAnswer;
};
```

**Option B: Confidence Scoring**
```typescript
interface EnhancedResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: Array<{
    title: string;
    relevance: number;
    excerpt: string;
  }>;
}
```

### 4. Message Length Limits

**Implementation for Chat Input:**

```typescript
// In ChatInput.tsx component
const MAX_MESSAGE_LENGTH = 500; // Characters

const handleSendMessage = () => {
  if (inputText.trim().length > MAX_MESSAGE_LENGTH) {
    Alert.alert(
      'Message Too Long',
      `Please keep your message under ${MAX_MESSAGE_LENGTH} characters. Current length: ${inputText.length}`,
      [{ text: 'OK' }]
    );
    return;
  }
  // Continue with sending...
};

// Add character counter
<Text style={styles.charCounter}>
  {inputText.length}/{MAX_MESSAGE_LENGTH}
</Text>
```

**Recommended Limits by Use Case:**
- **Mobile (default):** 500 characters
- **Tablet:** 750 characters  
- **Web:** 1000 characters
- **Voice input:** 2000 characters (longer for transcription)

### 5. Multi-Document Reasoning

**Option: Chain-of-Thought Prompting**
```typescript
const multiHopPrompt = `
Given these documents, answer step by step:

1. What does each document say about the topic?
2. How do the documents relate to each other?
3. What's the complete answer combining all information?
4. Are there any contradictions to note?

Documents:
${documents.map(d => `[${d.title}]: ${d.content}`).join('\n\n')}

Question: ${userQuestion}
`;
```

### 6. Temporal Awareness

**Option: Document Dating System**
```typescript
interface TemporalDocument extends RAGDocument {
  publishedDate?: Date;
  lastUpdated?: Date;
  expiresAt?: Date;
}

// In response generation
if (document.publishedDate) {
  const age = daysSince(document.publishedDate);
  if (age > 365) {
    context += `\n⚠️ Note: This information is from ${formatDate(document.publishedDate)} and may be outdated.`;
  }
}
```

### 7. Contradiction Detection

**Option: Automated Conflict Detection**
```typescript
const detectContradictions = (documents: RAGDocument[]): Contradiction[] => {
  const contradictions: Contradiction[] = [];
  
  // Compare key facts between documents
  documents.forEach((doc1, i) => {
    documents.slice(i + 1).forEach(doc2 => {
      const facts1 = extractKeyFacts(doc1);
      const facts2 = extractKeyFacts(doc2);
      
      facts1.forEach(fact1 => {
        facts2.forEach(fact2 => {
          if (areContradictory(fact1, fact2)) {
            contradictions.push({
              source1: doc1.title,
              source2: doc2.title,
              fact1,
              fact2
            });
          }
        });
      });
    });
  });
  
  return contradictions;
};
```

## Implementation Priorities

### Phase 1 (Immediate - After Testing)
1. **Message length limits** - Prevents token overflow
2. **Dynamic document limits** - Better results for complex queries
3. **Basic source attribution** - User trust and verification

### Phase 2 (Short Term)
4. **Enhanced system prompts** - Better response quality
5. **Confidence scoring** - Transparency about answer quality
6. **Temporal awareness** - Handles outdated information

### Phase 3 (Long Term)
7. **Multi-hop reasoning** - Complex query handling
8. **Contradiction detection** - Handles conflicting information
9. **Advanced citation system** - Academic-level sourcing

## Testing Considerations

Before implementing any enhancement:

1. **Baseline Metrics**
   - Current response quality scores
   - Average response time
   - Token usage per query
   - User satisfaction ratings

2. **A/B Testing**
   - Test each enhancement separately
   - Measure impact on response quality
   - Monitor system performance
   - Track user engagement

3. **Performance Impact**
   - More documents = higher latency
   - Complex prompts = more tokens
   - Citation tracking = processing overhead

## Cost Analysis

### Current System (3 docs)
- Average tokens per query: ~2,000
- Gemini cost: ~$0.002 per query

### Enhanced System (5-10 docs)
- Average tokens per query: ~4,000-8,000
- Gemini cost: ~$0.004-0.008 per query
- 2-4x increase in cost

## Recommendation

Start with:
1. **Message length limits** (no cost, improves UX)
2. **Dynamic document retrieval** (test with 5 docs max)
3. **Basic source attribution** (builds trust)

Then evaluate user feedback before implementing more complex features.

---

**Next Steps:**
1. Implement message length limits
2. Set up A/B testing framework
3. Create metrics dashboard
4. Gather baseline performance data