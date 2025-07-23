# Shared Documents System - Implementation Complete

## What Changed

### Database Schema
1. **Removed coach_id** from `document_sources` and `coach_documents` tables
2. **Created junction table** `coach_document_access` to link coaches to documents
3. **Updated search function** to use the junction table
4. **Added helper functions**:
   - `add_coach_document_access()` - Links documents to coaches
   - `get_diet_coach_ids()` - Returns array of all diet coach IDs

### Migration File
- `/supabase/migrations/009_shared_documents.sql`
- Run this in Supabase SQL editor to apply changes

### New Script
- `/scripts/add-document-to-rag-v2.js` - Supports multiple coaches
- Usage: `--coaches carnivore,paleo,keto` or `--coaches all-diet`

### Upload Script
- `/scripts/upload-all-basics-v2.sh` - Uses the new system
- Uploads PHD guidebook only once, linked to all coaches

## How It Works Now

1. **Documents are coach-agnostic** - Stored without a coach_id
2. **Junction table creates relationships** - Links coaches to documents
3. **One document, many coaches** - No duplication of embeddings
4. **Flexible access** - Easy to add/remove coach access

## Benefits

- **PHD Guidebook** - Stored once, accessible by all 7 diet coaches
- **Efficient storage** - No duplicate embeddings
- **Easy updates** - Update one document, all coaches see changes
- **Scalable** - Add new coaches without duplicating content

## Next Steps

1. Run the migration in Supabase
2. Use `upload-all-basics-v2.sh` to populate content
3. All diet coaches will have access to their specific basics + shared PHD guide

## Example Usage

```bash
# Add document to specific coaches
node scripts/add-document-to-rag-v2.js "document.md" \
  --coaches carnivore,paleo,keto \
  --title "Document Title"

# Add to all diet coaches
node scripts/add-document-to-rag-v2.js "document.md" \
  --coaches all-diet \
  --title "Document Title"
```