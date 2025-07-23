# RAG System Guide

This guide explains how to use the Retrieval-Augmented Generation (RAG) system in CoachMeld.

## Overview

The RAG system allows coaches to access a knowledge base of documents using semantic search powered by Gemini embeddings and pgvector.

## Key Features

- **3072-dimensional embeddings** using Gemini text-embedding-004
- **FREE embedding generation** (no per-token costs)
- **Vector similarity search** with pgvector
- **Access control** by subscription tier
- **Document versioning** and audit trails
- **Partner attribution** tracking

## Setup

### 1. Apply the Vector Dimension Migration

Since you're switching to 3072 dimensions:

```bash
# Copy and run in Supabase SQL Editor
cat supabase/migrations/008_update_vector_dimensions.sql
```

### 2. Set Environment Variables

Add to your `.env` file:

```bash
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

### 3. Test Gemini Embeddings

```bash
npm run test-embeddings
```

## Adding Documents

### Basic Usage

```bash
npm run add-document coach-content/carnivore/carnivore-basics.md --coach carnivore
```

### With Options

```bash
npm run add-document research-paper.pdf \
  --coach carnivore \
  --title "Carnivore Diet Research 2024" \
  --tier premium \
  --tags "research,clinical" \
  --supplied-by "Dr. Smith" \
  --supplier-type partner_doctor
```

### Available Options

- `--coach` (required): carnivore, fitness, mindfulness
- `--title`: Document title
- `--tier`: free, premium, pro (default: free)
- `--tags`: Comma-separated tags
- `--supplied-by`: Document supplier name
- `--supplier-type`: partner_doctor, internal_team, etc.
- `--license`: proprietary, cc_by, public_domain, etc.

## Searching Documents

### Basic Search

```bash
node scripts/search-rag.js "carnivore diet benefits" --coach carnivore
```

### Advanced Search

```bash
node scripts/search-rag.js "inflammation reduction" \
  --coach carnivore \
  --limit 10 \
  --threshold 0.6
```

## Document Processing Flow

1. **Document Upload**
   - Admin adds document via script
   - Document metadata stored in `document_sources`
   - Attribution and licensing tracked

2. **Text Processing**
   - Document split into chunks (max 6000 tokens)
   - Each chunk gets a title and metadata

3. **Embedding Generation**
   - Gemini API generates 3072-dim embeddings
   - Embeddings stored with chunks in `coach_documents`

4. **Search Process**
   - User query converted to embedding
   - Vector similarity search finds relevant chunks
   - Results filtered by access tier

## Access Control

Documents can have different access tiers:

- **free**: Available to all users
- **premium**: Requires active subscription
- **pro**: Future tier for advanced features

## Best Practices

### Document Preparation

1. **Use Clear Headings**: Helps with chunk boundaries
2. **Include Keywords**: Improves search relevance
3. **Cite Sources**: For medical/health information
4. **Structure Content**: Use sections and subsections

### Chunk Size

- Default: 6000 tokens per chunk
- Leaves room for metadata
- Gemini supports up to 8K tokens

### Performance Tips

1. **Batch Processing**: Add multiple documents together
2. **Monitor Rate Limits**: 1,500 requests/minute
3. **Use Tags**: Helps with filtering

## Troubleshooting

### "Permission denied" errors
- Ensure you're using the service key
- Check if you're an admin user

### Empty search results
- Verify documents exist for the coach
- Lower the similarity threshold
- Check if documents are marked as active

### Embedding failures
- Check Gemini API key
- Verify internet connection
- Monitor rate limits

## Admin Operations

### View All Documents

```sql
SELECT 
  ds.title,
  ds.coach_id,
  ds.process_status,
  COUNT(cd.id) as chunk_count
FROM document_sources ds
LEFT JOIN coach_documents cd ON ds.id = cd.source_id
GROUP BY ds.id
ORDER BY ds.created_at DESC;
```

### Check Document Processing

```sql
SELECT * FROM document_sources 
WHERE process_status != 'completed'
ORDER BY created_at DESC;
```

### View Document Usage

```sql
SELECT 
  cd.title,
  COUNT(dus.id) as retrieval_count,
  AVG(dus.query_similarity_score) as avg_relevance
FROM coach_documents cd
LEFT JOIN document_usage_stats dus ON cd.id = dus.document_id
GROUP BY cd.id
ORDER BY retrieval_count DESC;
```

## Future Enhancements

1. **Web UI** for document management
2. **PDF parsing** with text extraction
3. **Automatic reprocessing** for updated documents
4. **Bulk upload** interface
5. **Search analytics** dashboard