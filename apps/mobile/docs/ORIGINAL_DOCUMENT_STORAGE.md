# Original Document Storage Guide

## Overview

The RAG system now supports **optional** storage of original documents. This is useful for:
- Debugging and verification
- Re-processing documents with different chunking strategies
- Legal/compliance requirements
- User transparency ("show me the source")

## Storage Options

### 1. **No Storage** (Default)
- Only stores extracted text chunks
- Minimal storage usage
- Original cannot be retrieved

### 2. **Text Storage** (Database)
- Stores original as text in database
- Good for small text files (< 1MB)
- Fast retrieval
- Included in database backups

### 3. **File Storage** (Supabase Storage)
- Stores original file in Supabase Storage
- Good for PDFs and large files
- Preserves original format
- Can serve direct download links

## Configuration

### Global Settings (Per Coach)
```sql
-- Set default storage preference for a coach
UPDATE rag_storage_preferences
SET 
    store_originals_default = true,
    storage_method_default = 'file'
WHERE coach_id = 'carnivore';
```

### Per-Document Override
```sql
-- When inserting a document source
INSERT INTO document_sources (
    coach_id, 
    title, 
    source_type, 
    store_original,  -- Override default
    storage_method   -- Override default
) VALUES (
    'carnivore',
    'Research Paper.pdf',
    'pdf',
    true,
    'file'
);
```

## Usage Examples

### Upload with Original Storage

```typescript
// Example: Upload PDF with original storage
async function uploadPDFWithOriginal(file: File, coachId: string) {
    // 1. Create document source
    const { data: source } = await supabase
        .from('document_sources')
        .insert({
            coach_id: coachId,
            title: file.name,
            source_type: 'pdf',
            store_original: true,
            storage_method: 'file'
        })
        .select()
        .single();

    // 2. Upload original to storage
    const filePath = `coaches/${coachId}/${source.id}/${file.name}`;
    await supabase.storage
        .from('rag-documents')
        .upload(filePath, file);

    // 3. Update source with file path
    await supabase
        .from('document_sources')
        .update({ original_file_path: filePath })
        .eq('id', source.id);

    // 4. Process and chunk the document
    // ... chunking logic ...
}
```

### Retrieve Original Document

```typescript
// Get original document info
async function getOriginalDocument(sourceId: string) {
    const { data } = await supabase
        .rpc('get_original_document', { p_source_id: sourceId });

    if (data.storage_method === 'file') {
        // Get download URL
        const { data: url } = supabase.storage
            .from('rag-documents')
            .createSignedUrl(data.file_path, 3600); // 1 hour
        
        return { type: 'file', url };
    } else if (data.storage_method === 'text') {
        // Return text content
        return { type: 'text', content: data.content };
    }
}
```

## Storage Recommendations

### When to Store Originals

✅ **Store as File:**
- PDFs with formatting/images
- Legal documents
- Large documents (> 1MB)
- Binary formats (DOCX, etc.)

✅ **Store as Text:**
- Markdown files
- Small text files
- Configuration files
- Quick reference docs

❌ **Don't Store:**
- Temporary/test uploads
- Public domain content
- Extremely large files (> 50MB)
- Sensitive data (unless encrypted)

## SQL Commands

### Check Storage Settings
```sql
-- View current storage preferences
SELECT * FROM rag_storage_preferences;

-- Check which documents have originals stored
SELECT 
    ds.source_name,
    ds.storage_method,
    ds.store_original,
    CASE 
        WHEN ds.storage_method = 'text' THEN length(ds.original_content) || ' chars'
        WHEN ds.storage_method = 'file' THEN ds.original_file_path
        ELSE 'Not stored'
    END as storage_info
FROM document_sources ds
WHERE ds.coach_id = 'carnivore';
```

### Clean Up Storage
```sql
-- Remove original storage for old documents
UPDATE document_sources
SET 
    store_original = false,
    original_content = NULL,
    original_file_path = NULL,
    storage_method = 'none'
WHERE created_at < NOW() - INTERVAL '90 days'
AND store_original = true;
```

## Security Considerations

1. **Access Control**: Original documents follow the same RLS policies
2. **Storage Bucket**: The `rag-documents` bucket is private by default
3. **Signed URLs**: Use temporary signed URLs for file downloads
4. **Encryption**: Consider encrypting sensitive documents before storage

## Cost Implications

- **Database Storage**: ~$0.25/GB per month for text storage
- **File Storage**: ~$0.025/GB per month in Supabase Storage
- **Bandwidth**: Consider download costs if originals are frequently accessed

## Best Practices

1. **Set Reasonable Defaults**: Most documents don't need original storage
2. **Use File Storage for PDFs**: Preserves formatting and images
3. **Regular Cleanup**: Remove old originals to save space
4. **Monitor Usage**: Track storage consumption per coach
5. **Compress Large Files**: Consider compression before storage