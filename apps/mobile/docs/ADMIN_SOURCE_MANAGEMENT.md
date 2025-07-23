# Admin Source Management Guide

## Overview

Document source management is **developer/admin only**. Users cannot add sources to the RAG system.

## Management Options Analysis

### Option 1: SQL + Scripts (Recommended for Now) ✅
**Pros:**
- No additional app to maintain
- Direct database access
- Quick for small batches
- Already have SQL examples

**Cons:**
- Manual chunking for complex documents
- No GUI

**Best for:** Early development, small document sets

### Option 2: Desktop Admin App 
**Pros:**
- GUI for document management
- Batch processing
- Preview before upload
- Copyright scanning

**Cons:**
- Another app to maintain
- Development time

**Best for:** Long-term, large document sets

### Option 3: Web Admin Panel
**Pros:**
- Access from anywhere
- Could integrate into Supabase dashboard
- Share with trusted contributors

**Cons:**
- Security concerns
- Hosting requirements

**Best for:** Team management

## Current Approach: Scripts + SQL

### 1. Add Personal Research Notes
```bash
# Create a script: add-research.sql
cat > add-research.sql << 'EOF'
-- Add personal research document
WITH source AS (
    INSERT INTO document_sources (
        coach_id,
        title,
        source_type,
        license_type,
        copyright_holder,
        store_original,
        storage_method,
        metadata
    ) VALUES (
        'carnivore',
        'Carnivore Diet Research Notes 2024',
        'md',
        'personal_notes',
        'NoiseMeld',
        true,
        'text',
        jsonb_build_object(
            'author', 'NoiseMeld',
            'date_created', '2024-01-15',
            'access_tier', 'premium',
            'tags', ARRAY['research', 'personal', 'carnivore']
        )
    ) RETURNING id
)
INSERT INTO coach_documents (
    coach_id,
    source_id,
    title,
    content,
    chunk_index,
    total_chunks
) VALUES 
(
    'carnivore',
    (SELECT id FROM source),
    'Introduction to My Research',
    'Your actual content here...',
    0,
    1
);
EOF

# Run it
psql $DATABASE_URL < add-research.sql
```

### 2. Batch Upload Script
```bash
# Create upload-documents.sh
#!/bin/bash
# Upload all .md files in a directory

for file in ./documents/*.md; do
    echo "Processing $file..."
    # Extract first line as title
    title=$(head -n 1 "$file" | sed 's/^#\s*//')
    
    # Run SQL to insert
    psql $DATABASE_URL << EOF
    INSERT INTO document_sources (
        coach_id, title, source_type, 
        license_type, copyright_holder,
        original_content, store_original, storage_method
    ) VALUES (
        'carnivore',
        '$title',
        'md',
        'personal_notes',
        'NoiseMeld',
        '$(cat "$file" | sed "s/'/\\''/g")',
        true,
        'text'
    );
EOF
done
```

### 3. YouTube Batch Import
```javascript
// batch-youtube.js
const videos = [
    'https://youtube.com/watch?v=abc123',
    'https://youtube.com/watch?v=def456',
    // ... more videos
];

for (const url of videos) {
    await addYouTubeVideo(url, 'carnivore');
    await new Promise(r => setTimeout(r, 2000)); // Rate limit
}
```

## Copyright Scanner System

### Automatic Copyright Detection
```typescript
// copyright-scanner.ts
export function scanForCopyright(content: string): {
    hasCopyright: boolean;
    detectedHolder?: string;
    detectedLicense?: string;
    confidence: number;
} {
    const copyrightPatterns = [
        /Copyright\s*(?:©|\(c\))?\s*(\d{4})?\s*(?:by\s+)?([^.\n]+)/i,
        /©\s*(\d{4})?\s*([^.\n]+)/,
        /All rights reserved\.?\s*([^.\n]+)?/i,
        /Licensed under\s+([^.\n]+)/i,
        /This work is licensed under\s+([^.\n]+)/i,
    ];

    const licenseIndicators = {
        'creative commons': 'cc',
        'cc by': 'cc_by',
        'cc by-sa': 'cc_by_sa',
        'mit license': 'mit',
        'apache license': 'apache',
        'gpl': 'gpl',
        'public domain': 'public_domain',
    };

    let detectedHolder = null;
    let detectedLicense = null;
    let confidence = 0;

    // Check for copyright statements
    for (const pattern of copyrightPatterns) {
        const match = content.match(pattern);
        if (match) {
            confidence += 0.3;
            if (match[2]) {
                detectedHolder = match[2].trim();
            }
        }
    }

    // Check for license indicators
    const lowerContent = content.toLowerCase();
    for (const [indicator, license] of Object.entries(licenseIndicators)) {
        if (lowerContent.includes(indicator)) {
            detectedLicense = license;
            confidence += 0.2;
        }
    }

    // Check for DOI (academic papers)
    if (/doi:\s*10\.\d{4,}/i.test(content)) {
        confidence += 0.4;
    }

    // Check for ISBN (books)
    if (/isbn[:\s-]*(?:\d{10}|\d{13})/i.test(content)) {
        confidence += 0.5;
    }

    return {
        hasCopyright: confidence > 0.3,
        detectedHolder,
        detectedLicense,
        confidence: Math.min(confidence, 1),
    };
}
```

### Integration Example
```typescript
// Enhanced document upload with copyright scanning
async function uploadDocumentWithScan(
    filePath: string,
    content: string,
    coachId: string
) {
    const scan = scanForCopyright(content);
    
    if (scan.confidence > 0.7) {
        console.warn(`⚠️  High confidence copyright detected!`);
        console.warn(`   Holder: ${scan.detectedHolder || 'Unknown'}`);
        console.warn(`   License: ${scan.detectedLicense || 'Unknown'}`);
        
        // Require manual confirmation
        const confirm = await prompt('Continue with upload? (y/n): ');
        if (confirm !== 'y') return;
    }

    // Set attribution based on scan
    const copyright_holder = scan.detectedHolder || 'NoiseMeld';
    const license_type = scan.detectedLicense || 
        (scan.hasCopyright ? 'proprietary' : 'personal_notes');

    // Proceed with upload
    await supabase.from('document_sources').insert({
        coach_id: coachId,
        title: path.basename(filePath),
        source_type: path.extname(filePath).slice(1),
        license_type,
        copyright_holder,
        metadata: {
            copyright_scan: scan,
            uploaded_by: 'admin',
            scan_confidence: scan.confidence,
        }
    });
}
```

## Security Implementation

### 1. Database Level
```sql
-- Ensure only admins can insert documents
CREATE POLICY "Only admins can add document sources" ON document_sources
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND metadata->>'role' = 'admin'
    )
);
```

### 2. API Level
```typescript
// Supabase Edge Function with admin check
export async function uploadDocument(req: Request) {
    const { user } = await supabase.auth.getUser();
    
    // Check admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', user.id)
        .single();
    
    if (profile?.metadata?.role !== 'admin') {
        return new Response('Unauthorized', { status: 403 });
    }
    
    // Proceed with upload...
}
```

### 3. No UI in Main App
- Remove any document upload UI from the mobile app
- Admin functions only via:
  - Direct SQL
  - Admin scripts
  - Separate admin panel (future)

## Recommended Workflow

### For Small Updates (1-10 documents)
1. Use SQL scripts directly
2. Manual copyright check
3. Copy/paste content

### For Batch Updates (10+ documents)
1. Prepare documents in folders
2. Run copyright scanner:
   ```bash
   node scripts/copyright-scanner.js ./documents/
   ```
3. Review flagged content
4. Generate SQL for safe documents:
   ```bash
   node scripts/copyright-scanner.js ./documents/ --sql --coach=carnivore > import.sql
   ```
5. Review and run SQL

### For YouTube Videos
1. Create playlist of educational videos
2. Run batch YouTube script
3. Auto-attribution to creators

## Quick Commands

### Scan Single File
```bash
node scripts/copyright-scanner.js my-research.md
```

### Scan Directory
```bash
node scripts/copyright-scanner.js ./research-folder/
```

### Generate Import SQL
```bash
# Only includes low-risk documents
node scripts/copyright-scanner.js ./docs/ --sql --coach=carnivore > safe-docs.sql

# Review the SQL
cat safe-docs.sql

# Run if looks good
psql $DATABASE_URL < safe-docs.sql
```

## Future Admin Panel Features
- Drag-drop document upload
- Automatic text extraction (PDF, DOCX)
- Copyright scanner with override options
- Batch operations
- Version control for documents
- Usage analytics per document