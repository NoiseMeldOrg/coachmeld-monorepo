# Testing RAG Migrations Guide

This guide explains how to test and verify the RAG (Retrieval-Augmented Generation) system migrations for CoachMeld.

## Overview

The RAG system enables coaches to access and search through uploaded documents using vector similarity search powered by pgvector.

## Migration Files

The RAG system consists of several migration files:

1. **004_vector_database_minimal.sql** - Core vector database tables
2. **005_optional_document_storage.sql** - Document storage enhancements
3. **006_legal_compliance.sql** - Legal and compliance features
4. **007_source_tracking_system.sql** - Partner and source attribution

## Testing Process

### 1. Check Migration Status

```bash
npm run test-rag
```

This command will:
- Connect to your Supabase instance
- Check if all RAG tables exist
- Verify pgvector extension is installed
- Test key functions
- Report any missing components

### 2. Apply Missing Migrations

If the test reveals missing tables (like `partner_agreements`), run:

```bash
node scripts/apply-migrations.js
```

This will:
- Show which migrations need to be applied
- Display the SQL content to copy
- Provide instructions for applying via Supabase dashboard

To apply migrations:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to SQL Editor
3. Create a new query
4. Paste the migration SQL
5. Click "Run"

### 3. Test Vector Operations

After migrations are applied, test vector functionality:

```bash
npm run test-vectors
```

This command will:
- Create test documents with mock embeddings
- Test vector similarity search
- Verify embedding storage (1536 dimensions)
- Test query caching
- Clean up test data

## Current Status

Based on testing:
- ✅ Core vector tables (migration 004) are applied
- ✅ pgvector extension is installed and working
- ❌ Source tracking tables (migration 007) need to be applied
- ✅ Vector operations are functional (with auth limitations)

## Key Tables

### Document Management
- `document_sources` - Tracks document metadata and processing status
- `coach_documents` - Stores document chunks with embeddings
- `coach_access_tiers` - Controls document access by subscription tier

### Search & Performance
- `rag_query_cache` - Caches search results for performance
- `document_usage_stats` - Tracks document retrieval analytics

### Partner Tracking (Migration 007)
- `partner_agreements` - Partnership and content licensing agreements
- `partner_coaches` - Doctor/coach partnerships
- `source_contributions` - Tracks content contributors
- `content_audit_trail` - Audit log for content changes

## Next Steps

1. **Apply Migration 007**
   - Run the missing migration for partner tracking
   - Verify with `npm run test-rag`

2. **Set Up Authentication**
   - Configure proper user authentication for vector search
   - Test with authenticated user context

3. **Integrate OpenAI**
   - Replace mock embeddings with real OpenAI embeddings
   - Use ada-002 model (1536 dimensions)

4. **Add Document Upload**
   - Implement document upload UI
   - Create document processing pipeline
   - Generate and store embeddings

5. **Test Search Functionality**
   - Implement search UI in coach chat
   - Test retrieval quality
   - Monitor performance

## Troubleshooting

### "relation does not exist" errors
- Migration hasn't been applied
- Run `node scripts/apply-migrations.js` and follow instructions

### Vector search authentication errors
- Expected behavior without proper user context
- Will be resolved when auth is implemented

### Docker daemon errors
- Local Supabase requires Docker
- Use remote Supabase instance instead

## Security Considerations

- All tables have Row Level Security (RLS) enabled
- Users can only access documents based on subscription tier
- Audit trail tracks all content modifications
- Partner agreements control content usage rights