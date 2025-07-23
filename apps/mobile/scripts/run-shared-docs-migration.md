# Run Shared Documents Migration

Follow these steps to complete the shared documents migration:

## Step 1: Clean the RAG System
Run this SQL in Supabase SQL Editor:
```sql
-- First, check what documents exist
SELECT 
    ds.id,
    ds.source_name,
    ds.coach_id,
    COUNT(cd.id) as chunk_count
FROM document_sources ds
LEFT JOIN coach_documents cd ON cd.source_id = ds.id
GROUP BY ds.id, ds.source_name, ds.coach_id
ORDER BY ds.created_at DESC;

-- Then clean everything
TRUNCATE TABLE coach_documents CASCADE;
TRUNCATE TABLE document_sources CASCADE;
```

## Step 2: Apply the Migration
Run the migration file in Supabase SQL Editor:
- Copy the contents of `/supabase/migrations/010_shared_documents.sql`
- Paste and run in Supabase SQL Editor
- Note: This migration drops the policy first to avoid dependency errors

## Step 3: Verify Migration Success
Run this SQL to verify:
```sql
-- Check new junction table exists
SELECT * FROM coach_document_access LIMIT 5;

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('add_coach_document_access', 'get_diet_coach_ids');

-- Verify columns were dropped
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('document_sources', 'coach_documents') 
AND column_name = 'coach_id';
-- Should return 0 rows
```

## Step 4: Upload All Documents
After migration is confirmed successful, run:
```bash
cd /home/intro/coach-meld-test/CoachMeld
chmod +x scripts/upload-all-basics-v2.sh
./scripts/upload-all-basics-v2.sh
```

## Expected Results
- 7 unique documents uploaded (6 diet-specific + 1 PHD guide)
- 13 total coach-document relationships created
- PHD guidebook accessible by all 7 diet coaches