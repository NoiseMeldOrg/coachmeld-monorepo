# Embedding Model Decision: Gemini vs OpenAI

This document outlines the decision to use Gemini embeddings for the CoachMeld RAG system.

## Executive Summary

**Decision**: Use Gemini text-embedding-004 with 1536 dimensions
- **Cost**: FREE (vs $0.10 per million tokens for OpenAI)
- **Quality**: State-of-the-art embeddings with dimension reduction
- **Storage Impact**: Same as OpenAI (no additional cost)

## Update: pgvector Dimension Limitation

Due to pgvector's 2000-dimension limit for indexes, we're using Gemini's dimension reduction feature to output 1536-dimensional embeddings. This matches our existing database schema and avoids index creation errors.

## Cost Comparison

### Embedding Generation Costs

| Model | Cost per Million Tokens | 10M Tokens | 100M Tokens |
|-------|------------------------|------------|-------------|
| OpenAI ada-002 | $0.10 | $1.00 | $10.00 |
| Gemini text-embedding-004 | $0.00 | $0.00 | $0.00 |

### Storage Cost Analysis

#### Vector Storage Size
- **1536 dimensions**: 4 bytes × 1536 = 6,144 bytes per vector
- **3072 dimensions**: 4 bytes × 3072 = 12,288 bytes per vector

#### Storage Cost Breakdown

| Document Count | 1536-dim Size | 3072-dim Size | Extra Storage | Extra Cost/Month |
|---------------|---------------|---------------|---------------|------------------|
| 10,000 | 61.44 MB | 122.88 MB | 61.44 MB | $0.0013 |
| 50,000 | 307.2 MB | 614.4 MB | 307.2 MB | $0.0065 |
| 100,000 | 614.4 MB | 1.23 GB | 614.4 MB | $0.013 |
| 500,000 | 3.07 GB | 6.14 GB | 3.07 GB | $0.065 |
| 1,000,000 | 6.14 GB | 12.29 GB | 6.15 GB | $0.13 |

*Based on Supabase pricing: $0.021 per GB per month*

## Performance Implications

### Advantages of 3072 Dimensions
1. **Better Semantic Understanding**
   - More nuanced representation of medical/health concepts
   - Better distinction between similar topics
   - Improved context understanding

2. **Higher Retrieval Quality**
   - More accurate similarity matching
   - Fewer false positives
   - Better relevance ranking

### Performance Trade-offs
1. **Search Speed**: ~2x slower (comparing larger vectors)
2. **Memory Usage**: 2x during search operations
3. **Network Transfer**: 2x when sending embeddings

## Recommendation for CoachMeld

### Why Gemini with 3072 Dimensions

1. **Zero Embedding Costs**
   - Save money on every document added
   - No budget constraints on content growth

2. **Medical Content Accuracy**
   - Health information requires high accuracy
   - Better distinction between medical concepts
   - Reduced risk of retrieving wrong information

3. **Minimal Storage Impact**
   - Even at 1M documents: only $0.13/month extra
   - Covered by Supabase free tier for typical usage

4. **Future Proof**
   - Latest Gemini models
   - Room for growth without re-embedding

### Implementation Notes

- **No existing data**: Can start fresh with optimal setup
- **Rate limits**: 1,500 requests/minute (very generous)
- **Token limits**: 8K tokens per embedding request
- **Model stability**: Free tier has been reliable

## Decision Matrix

| Factor | OpenAI 1536-dim | Gemini 3072-dim | Winner |
|--------|-----------------|-----------------|---------|
| Embedding Cost | $0.10/M tokens | FREE | Gemini ✅ |
| Storage Cost | Lower | +$0.13/mo @ 1M docs | OpenAI (negligible) |
| Accuracy | Good | Better | Gemini ✅ |
| Search Speed | Faster | 2x slower | OpenAI |
| Future Proof | Older model | Latest model | Gemini ✅ |
| API Reliability | Excellent | Excellent | Tie |

## Conclusion

For CoachMeld's health coaching use case, Gemini embeddings with 3072 dimensions provide:
- Superior accuracy for medical content
- Zero ongoing embedding costs
- Negligible storage cost increase
- Better long-term scalability

The performance trade-off (2x slower searches) is acceptable given the improved accuracy and zero cost.