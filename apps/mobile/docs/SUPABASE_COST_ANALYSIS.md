# Supabase Cost Analysis for CoachMeld

## Overview

This document analyzes the Supabase costs for running CoachMeld based on current pricing (2024) and our system architecture.

## Supabase Pricing Tiers

### Free Plan ($0/month)
- 2 free projects
- 500MB database space
- 1GB bandwidth
- 50MB file storage
- Pauses after 7 days of inactivity
- Suitable for: Development and testing

### Pro Plan ($25/month)
- 8GB database space
- 250GB bandwidth
- 100GB file storage
- $10 monthly compute credits
- No pausing
- Suitable for: Production launch, up to ~1,000 active users

### Team Plan ($599/month)
- Everything in Pro
- SOC2 compliance
- Priority support
- Suitable for: Enterprise requirements

## CoachMeld Database Analysis

### Storage Requirements by Table

#### High-Growth Tables (80% of storage)
1. **messages** - User/coach conversations
   - Avg size per row: ~500 bytes
   - Growth rate: 10 messages/user/day
   - At 1,000 users: 10,000 rows/day = 5MB/day

2. **coach_documents** - RAG knowledge base with vectors
   - Avg size per row: ~3KB (including 768-dimension vector)
   - Current estimate: ~10,000 documents = 30MB
   - Growth: Minimal after initial load

3. **document_usage_stats** - Analytics
   - Avg size per row: ~200 bytes
   - Growth rate: 5 queries/user/day
   - At 1,000 users: 5,000 rows/day = 1MB/day

#### Medium-Growth Tables (15% of storage)
- **conversation_summaries**: ~2KB per summary
- **user_memories**: ~1KB per user
- **subscriptions**: ~500 bytes per subscription
- **profiles**: ~1KB per user

#### Low-Growth Tables (5% of storage)
- **coaches**: ~2KB per coach (fixed ~10 coaches)
- **disclaimer_acceptances**: ~200 bytes per acceptance
- Other compliance/configuration tables

### Vector Storage Calculations

Vector storage is a significant consideration with pgvector:
- Vector dimension: 768 (reduced from 1536)
- Storage per vector: 768 × 4 bytes = 3,072 bytes
- With overhead: ~3.5KB per vector

**Current Vector Storage:**
- ~10,000 knowledge documents × 3.5KB = 35MB
- Query cache (temporary): ~10MB
- User context documents: ~1,000 users × 5 docs × 3.5KB = 17.5MB
- **Total Vector Storage**: ~62.5MB

## API Request Volume Analysis

### Request Types and Frequency

#### Authentication (10% of requests)
- Sign in/out: 2 requests/user/day
- Session refresh: 5 requests/user/day
- At 1,000 users: 7,000 requests/day

#### Chat Operations (60% of requests)
- Send message: 10 requests/user/day
- Fetch messages: 20 requests/user/day
- RAG queries: 10 requests/user/day
- At 1,000 users: 40,000 requests/day

#### Profile/Settings (20% of requests)
- Profile reads: 5 requests/user/day
- Profile updates: 1 request/user/day
- Coach selection: 2 requests/user/day
- At 1,000 users: 8,000 requests/day

#### Background Operations (10% of requests)
- Conversation summaries: 1 request/user/day
- Analytics: 5 requests/user/day
- At 1,000 users: 6,000 requests/day

**Total Daily Requests at 1,000 users: ~61,000**

## Monthly Cost Projections

### Database Storage Growth

| Month | Users | Messages | Documents | Total DB Size | Storage Cost |
|-------|-------|----------|-----------|--------------|--------------|
| 1 | 100 | 30K | 10K | 150MB | Free Tier |
| 3 | 500 | 450K | 12K | 500MB | Free Tier |
| 6 | 1,000 | 1.8M | 15K | 1.5GB | Pro ($25) |
| 12 | 5,000 | 18M | 20K | 10GB | Pro + $5* |
| 24 | 10,000 | 72M | 30K | 40GB | Pro + $40* |

*Additional storage at $0.125/GB/month

### Bandwidth Usage

| Users | Daily Bandwidth | Monthly Bandwidth | Cost |
|-------|----------------|-------------------|------|
| 100 | 100MB | 3GB | Free Tier |
| 1,000 | 1GB | 30GB | Pro Plan |
| 5,000 | 5GB | 150GB | Pro Plan |
| 10,000 | 10GB | 300GB | Pro + $12.50* |

*Additional bandwidth at $0.09/GB

### Edge Function Invocations

Edge functions are used for:
- Chat completions (Gemini API calls)
- Embedding generation
- RAG retrieval

| Users | Daily Invocations | Monthly | Cost |
|-------|------------------|---------|------|
| 100 | 1,000 | 30K | Free |
| 1,000 | 10,000 | 300K | Free |
| 5,000 | 50,000 | 1.5M | Free |
| 10,000 | 100,000 | 3M | Free |

Note: Edge Functions have generous free tier (2M invocations)

## Cost Optimization Strategies

### 1. Database Optimization
- **Message Archival**: Archive messages older than 6 months
- **Vector Optimization**: Already reduced from 1536 to 768 dimensions
- **Index Optimization**: Use partial indexes for active data
- **Data Compression**: Enable TOAST compression for large text fields

### 2. Caching Strategy
- **Query Cache**: Implemented 24-hour cache for RAG queries
- **Profile Cache**: Cache user profiles in app
- **Message Pagination**: Load messages in chunks

### 3. Storage Management
```sql
-- Archive old messages
CREATE TABLE messages_archive AS 
SELECT * FROM messages 
WHERE created_at < NOW() - INTERVAL '6 months';

-- Vacuum to reclaim space
VACUUM FULL messages;
```

### 4. Bandwidth Optimization
- **Message Compression**: Gzip responses
- **Pagination**: Limit message fetching to 50 at a time
- **Image Optimization**: If adding images, use WebP format

## Total Monthly Cost Estimates

### Startup Phase (0-500 users)
- **Supabase**: Free Tier ($0)
- **Considerations**: Stay under 500MB database

### Growth Phase (500-5,000 users)
- **Supabase Pro**: $25/month
- **Additional Storage**: ~$5/month
- **Total**: ~$30/month

### Scale Phase (5,000-20,000 users)
- **Supabase Pro**: $25/month
- **Additional Storage**: ~$50/month
- **Additional Bandwidth**: ~$20/month
- **Total**: ~$95/month

### Enterprise Phase (20,000+ users)
- **Consider**: Supabase Team plan for compliance
- **Or**: Self-hosted Postgres with pgvector
- **Estimated**: $599+/month

## Key Insights

1. **Supabase is cost-effective** for up to ~10,000 users on Pro plan
2. **Vector storage** is efficient after optimization (768 dimensions)
3. **Messages table** will be the primary growth concern
4. **No API request charges** is a major advantage
5. **Edge Functions** have generous free tier

## Recommendations

### Immediate Actions
1. **Monitor** database size weekly
2. **Implement** message pagination
3. **Set up** automated backups

### Before 1,000 Users
1. **Upgrade** to Pro plan
2. **Implement** message archival strategy
3. **Optimize** vector queries with better indexes

### Before 5,000 Users
1. **Plan** for additional storage costs
2. **Consider** read replicas for analytics
3. **Implement** comprehensive caching

### Cost Comparison with Alternatives
- **Firebase**: Would cost ~$200/month at 5,000 users
- **AWS RDS + Lambda**: Would cost ~$150/month at 5,000 users
- **Supabase**: ~$30/month at 5,000 users

Supabase provides excellent value for CoachMeld's architecture, especially with free API requests and integrated pgvector support.