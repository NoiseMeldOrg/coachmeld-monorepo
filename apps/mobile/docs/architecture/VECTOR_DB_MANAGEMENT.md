# Vector Database Management Guide

## Table of Contents
1. [Database Initialization](#database-initialization)
2. [Adding Research Data](#adding-research-data)
3. [Update Strategies](#update-strategies)
4. [Bulk Import Process](#bulk-import-process)
5. [Document Versioning](#document-versioning)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Backup and Recovery](#backup-and-recovery)
8. [Performance Tuning](#performance-tuning)

## Database Initialization

### Step 1: Enable pgvector Extension

```sql
-- Connect to your Supabase database
-- Run this in the SQL editor

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Step 2: Create Schema

```sql
-- Create the complete vector database schema
-- Run /supabase/migrations/003_vector_database.sql

-- Main documents table
CREATE TABLE IF NOT EXISTS coach_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    source_id UUID REFERENCES document_sources(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_chunk UNIQUE (source_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX idx_coach_documents_coach_id ON coach_documents(coach_id);
CREATE INDEX idx_coach_documents_embedding ON coach_documents USING ivfflat (embedding vector_l2_ops);
CREATE INDEX idx_coach_documents_metadata ON coach_documents USING GIN (metadata);
```

### Step 3: Initialize Embedding Service

```typescript
// Initialize embedding service
// /src/services/embedding/embedingService.ts

import { Configuration, OpenAIApi } from 'openai';

export class EmbeddingService {
    private openai: OpenAIApi;
    private model = 'text-embedding-ada-002';
    
    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.openai = new OpenAIApi(configuration);
    }
    
    async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.createEmbedding({
            model: this.model,
            input: text,
        });
        
        return response.data.data[0].embedding;
    }
    
    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        const response = await this.openai.createEmbedding({
            model: this.model,
            input: texts,
        });
        
        return response.data.data.map(d => d.embedding);
    }
}
```

## Adding Research Data

### Manual Upload Interface

```typescript
// Admin interface for uploading research documents
// /src/services/documentUpload/uploadService.ts

export class DocumentUploadService {
    async uploadResearchDocument(
        file: File,
        coachId: string,
        metadata: {
            title: string;
            author?: string;
            publicationDate?: Date;
            documentType: 'research' | 'guide' | 'protocol' | 'case_study';
            tags: string[];
            accessTier: 'free' | 'premium';
        }
    ): Promise<void> {
        // 1. Validate file
        this.validateFile(file);
        
        // 2. Extract text content
        const text = await this.extractText(file);
        
        // 3. Create document source record
        const sourceId = await this.createDocumentSource({
            coach_id: coachId,
            title: metadata.title,
            source_type: this.getFileType(file),
            file_hash: await this.generateFileHash(file),
            metadata: metadata
        });
        
        // 4. Process and chunk document
        const chunks = await this.processDocument(text, sourceId, coachId);
        
        // 5. Generate embeddings
        const embeddings = await this.generateEmbeddings(chunks);
        
        // 6. Store in vector database
        await this.storeDocumentChunks(chunks, embeddings, sourceId, coachId, metadata);
    }
    
    private async extractText(file: File): Promise<string> {
        const fileType = file.name.split('.').pop()?.toLowerCase();
        
        switch (fileType) {
            case 'pdf':
                return await this.extractPdfText(file);
            case 'txt':
            case 'md':
                return await file.text();
            case 'docx':
                return await this.extractDocxText(file);
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }
    
    private async processDocument(
        text: string,
        sourceId: string,
        coachId: string
    ): Promise<DocumentChunk[]> {
        // Clean and normalize text
        const cleanedText = this.cleanText(text);
        
        // Smart chunking based on document structure
        const chunks = this.smartChunk(cleanedText);
        
        return chunks.map((chunk, index) => ({
            source_id: sourceId,
            coach_id: coachId,
            content: chunk.text,
            chunk_index: index,
            total_chunks: chunks.length,
            metadata: {
                start_char: chunk.startChar,
                end_char: chunk.endChar,
                section: chunk.section
            }
        }));
    }
}
```

### Bulk Import from Research Folder

```typescript
// Bulk import script for research documents
// /scripts/bulkImportResearch.ts

import { DocumentUploadService } from '../src/services/documentUpload/uploadService';
import * as fs from 'fs';
import * as path from 'path';

interface ResearchImportConfig {
    coachId: string;
    folderPath: string;
    defaultMetadata: {
        accessTier: 'free' | 'premium';
        documentType: string;
        tags: string[];
    };
}

export async function bulkImportResearch(config: ResearchImportConfig) {
    const uploadService = new DocumentUploadService();
    const files = fs.readdirSync(config.folderPath);
    
    console.log(`Found ${files.length} files to import`);
    
    for (const fileName of files) {
        try {
            const filePath = path.join(config.folderPath, fileName);
            const file = fs.readFileSync(filePath);
            
            // Extract metadata from filename if possible
            const metadata = extractMetadataFromFilename(fileName);
            
            await uploadService.uploadResearchDocument(
                new File([file], fileName),
                config.coachId,
                {
                    ...config.defaultMetadata,
                    ...metadata,
                    title: metadata.title || fileName
                }
            );
            
            console.log(`✓ Imported: ${fileName}`);
        } catch (error) {
            console.error(`✗ Failed to import ${fileName}:`, error);
        }
    }
}

// Usage example
async function importCarnivoreResearch() {
    await bulkImportResearch({
        coachId: 'carnivore',
        folderPath: './research/carnivore',
        defaultMetadata: {
            accessTier: 'premium',
            documentType: 'research',
            tags: ['carnivore', 'nutrition', 'health']
        }
    });
}
```

### API Endpoint for Document Upload

```typescript
// Supabase Edge Function: /supabase/functions/upload-document/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { multiParser } from 'https://deno.land/x/multiparser@v2.1.0/mod.ts';

serve(async (req) => {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !isAdmin(authHeader)) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    // Parse multipart form data
    const form = await multiParser(req);
    const file = form.files.document;
    const metadata = JSON.parse(form.fields.metadata);
    
    // Process document
    const uploadService = new DocumentUploadService();
    await uploadService.uploadResearchDocument(
        file,
        form.fields.coachId,
        metadata
    );
    
    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
});
```

## Update Strategies

### Document Update Workflow

```typescript
// Document update service
export class DocumentUpdateService {
    async updateDocument(
        documentId: string,
        updates: {
            content?: string;
            metadata?: any;
            regenerateEmbedding?: boolean;
        }
    ): Promise<void> {
        // 1. Create new version
        const newVersion = await this.createNewVersion(documentId);
        
        // 2. Apply updates
        if (updates.content) {
            await this.updateContent(newVersion.id, updates.content);
            
            // 3. Regenerate embedding if content changed
            if (updates.regenerateEmbedding) {
                const embedding = await this.generateEmbedding(updates.content);
                await this.updateEmbedding(newVersion.id, embedding);
            }
        }
        
        // 4. Update metadata
        if (updates.metadata) {
            await this.updateMetadata(newVersion.id, updates.metadata);
        }
        
        // 5. Mark old version as inactive
        await this.deactivateOldVersion(documentId);
    }
    
    private async createNewVersion(documentId: string): Promise<Document> {
        const oldDoc = await this.getDocument(documentId);
        
        return await this.supabase
            .from('coach_documents')
            .insert({
                ...oldDoc,
                id: undefined, // Generate new ID
                version: oldDoc.version + 1,
                created_at: new Date(),
                updated_at: new Date()
            })
            .single();
    }
}
```

### Automated Update Pipeline

```typescript
// Automated document refresh
export class DocumentRefreshService {
    async refreshDocuments(coachId: string) {
        // 1. Get all active documents
        const documents = await this.getActiveDocuments(coachId);
        
        // 2. Check for updates
        for (const doc of documents) {
            if (await this.needsUpdate(doc)) {
                await this.refreshDocument(doc);
            }
        }
    }
    
    private async needsUpdate(doc: Document): boolean {
        // Check if document is older than 30 days
        const age = Date.now() - new Date(doc.updated_at).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        
        return age > thirtyDays;
    }
    
    private async refreshDocument(doc: Document) {
        // Re-fetch source if URL-based
        if (doc.metadata.source_url) {
            const newContent = await this.fetchUrl(doc.metadata.source_url);
            if (newContent !== doc.content) {
                await this.updateDocument(doc.id, {
                    content: newContent,
                    regenerateEmbedding: true
                });
            }
        }
    }
}
```

## Bulk Import Process

### CSV Import Format

```csv
coach_id,title,content,document_type,access_tier,tags,author,publication_date
carnivore,"Benefits of Carnivore Diet","Full text content here...",research,premium,"carnivore,health,nutrition","Dr. Smith","2024-01-15"
carnivore,"Meal Planning Guide","Guide content here...",guide,free,"carnivore,meals,planning","Coach John","2024-02-01"
```

### Bulk Import Script

```typescript
// CSV bulk import
import { parse } from 'csv-parse';
import * as fs from 'fs';

export async function bulkImportFromCSV(csvPath: string) {
    const parser = fs
        .createReadStream(csvPath)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true
        }));
    
    const uploadService = new DocumentUploadService();
    let successCount = 0;
    let errorCount = 0;
    
    for await (const record of parser) {
        try {
            // Process each row
            await uploadService.uploadResearchDocument(
                new File([record.content], record.title),
                record.coach_id,
                {
                    title: record.title,
                    author: record.author,
                    publicationDate: new Date(record.publication_date),
                    documentType: record.document_type,
                    tags: record.tags.split(',').map(t => t.trim()),
                    accessTier: record.access_tier
                }
            );
            successCount++;
        } catch (error) {
            console.error(`Failed to import "${record.title}":`, error);
            errorCount++;
        }
    }
    
    console.log(`Import complete: ${successCount} successful, ${errorCount} failed`);
}
```

## Document Versioning

### Version Control Schema

```sql
-- Document version tracking
CREATE TABLE document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    changed_by UUID REFERENCES auth.users(id),
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique version numbers per document
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Version comparison view
CREATE VIEW document_version_diff AS
SELECT 
    v1.document_id,
    v1.version_number as version_from,
    v2.version_number as version_to,
    v1.content as content_from,
    v2.content as content_to,
    v2.change_summary,
    v2.created_at as changed_at
FROM document_versions v1
JOIN document_versions v2 ON v1.document_id = v2.document_id
WHERE v2.version_number = v1.version_number + 1;
```

### Version Management Service

```typescript
export class VersionManagementService {
    async createVersion(
        documentId: string,
        changes: {
            content: string;
            changeSummary: string;
            changedBy: string;
        }
    ): Promise<void> {
        // Get current version
        const currentVersion = await this.getCurrentVersion(documentId);
        
        // Create new version
        await this.supabase
            .from('document_versions')
            .insert({
                document_id: documentId,
                version_number: currentVersion + 1,
                content: changes.content,
                embedding: await this.generateEmbedding(changes.content),
                change_summary: changes.changeSummary,
                changed_by: changes.changedBy
            });
        
        // Update main document
        await this.supabase
            .from('coach_documents')
            .update({
                content: changes.content,
                version: currentVersion + 1,
                updated_at: new Date()
            })
            .eq('id', documentId);
    }
    
    async rollbackToVersion(documentId: string, targetVersion: number): Promise<void> {
        // Get target version content
        const { data: version } = await this.supabase
            .from('document_versions')
            .select('*')
            .eq('document_id', documentId)
            .eq('version_number', targetVersion)
            .single();
        
        // Create new version as rollback
        await this.createVersion(documentId, {
            content: version.content,
            changeSummary: `Rolled back to version ${targetVersion}`,
            changedBy: 'system'
        });
    }
}
```

## Maintenance Procedures

### Regular Maintenance Tasks

```typescript
// Maintenance service
export class VectorDBMaintenanceService {
    async performDailyMaintenance() {
        console.log('Starting daily maintenance...');
        
        // 1. Clean expired cache
        await this.cleanExpiredCache();
        
        // 2. Optimize indexes
        await this.optimizeIndexes();
        
        // 3. Update statistics
        await this.updateStatistics();
        
        // 4. Check for orphaned documents
        await this.cleanOrphanedDocuments();
        
        console.log('Daily maintenance complete');
    }
    
    private async cleanExpiredCache() {
        const { data, error } = await this.supabase
            .from('rag_query_cache')
            .delete()
            .lt('expires_at', new Date().toISOString());
        
        console.log(`Cleaned ${data?.length || 0} expired cache entries`);
    }
    
    private async optimizeIndexes() {
        // Reindex vector indexes periodically
        await this.supabase.rpc('reindex_vectors', {
            table_name: 'coach_documents',
            index_name: 'idx_coach_documents_embedding'
        });
    }
    
    private async updateStatistics() {
        // Update PostgreSQL statistics
        await this.supabase.rpc('analyze_tables', {
            tables: ['coach_documents', 'document_sources', 'rag_query_cache']
        });
    }
    
    private async cleanOrphanedDocuments() {
        // Remove chunks without sources
        const { data } = await this.supabase
            .from('coach_documents')
            .delete()
            .is('source_id', null)
            .eq('is_active', false);
        
        console.log(`Removed ${data?.length || 0} orphaned documents`);
    }
}

// Schedule maintenance
import * as cron from 'node-cron';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    const maintenance = new VectorDBMaintenanceService();
    await maintenance.performDailyMaintenance();
});
```

### Index Optimization

```sql
-- Optimize vector search performance
-- Run periodically (monthly)

-- Rebuild indexes
REINDEX INDEX idx_coach_documents_embedding;
REINDEX INDEX idx_coach_documents_coach_id;

-- Update table statistics
ANALYZE coach_documents;
ANALYZE document_sources;

-- Vacuum to reclaim space
VACUUM ANALYZE coach_documents;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Backup and Recovery

### Backup Strategy

```typescript
// Backup service
export class VectorDBBackupService {
    async createBackup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupName = `vector_db_backup_${timestamp}`;
        
        // 1. Export documents
        const documents = await this.exportDocuments();
        
        // 2. Export embeddings separately (large data)
        const embeddings = await this.exportEmbeddings();
        
        // 3. Export metadata
        const metadata = await this.exportMetadata();
        
        // 4. Create backup package
        const backup = {
            version: '1.0',
            timestamp,
            documents: documents.length,
            data: {
                documents,
                embeddings,
                metadata
            }
        };
        
        // 5. Store backup
        await this.storeBackup(backupName, backup);
        
        return backupName;
    }
    
    async restoreFromBackup(backupName: string): Promise<void> {
        // 1. Load backup
        const backup = await this.loadBackup(backupName);
        
        // 2. Validate backup
        this.validateBackup(backup);
        
        // 3. Clear existing data (with confirmation)
        await this.clearExistingData();
        
        // 4. Restore documents
        await this.restoreDocuments(backup.data.documents);
        
        // 5. Restore embeddings
        await this.restoreEmbeddings(backup.data.embeddings);
        
        // 6. Rebuild indexes
        await this.rebuildIndexes();
    }
}
```

### Incremental Backup

```sql
-- Track changes for incremental backup
CREATE TABLE vector_db_changelog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID NOT NULL,
    changed_data JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to track changes
CREATE OR REPLACE FUNCTION track_vector_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO vector_db_changelog (table_name, operation, record_id, changed_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(COALESCE(NEW, OLD))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER track_documents_changes
AFTER INSERT OR UPDATE OR DELETE ON coach_documents
FOR EACH ROW EXECUTE FUNCTION track_vector_changes();
```

## Performance Tuning

### Query Optimization

```typescript
// Performance monitoring
export class PerformanceMonitor {
    async analyzeQueryPerformance() {
        // Get slow queries
        const slowQueries = await this.supabase.rpc('get_slow_queries', {
            threshold_ms: 1000
        });
        
        // Analyze query patterns
        const patterns = this.analyzePatterns(slowQueries);
        
        // Generate optimization recommendations
        return this.generateRecommendations(patterns);
    }
    
    private generateRecommendations(patterns: QueryPattern[]): Recommendation[] {
        const recommendations: Recommendation[] = [];
        
        patterns.forEach(pattern => {
            if (pattern.avgExecutionTime > 2000) {
                recommendations.push({
                    type: 'index',
                    message: `Consider adding index for ${pattern.commonFilters}`,
                    impact: 'high'
                });
            }
            
            if (pattern.resultSize > 100) {
                recommendations.push({
                    type: 'pagination',
                    message: 'Implement pagination for large result sets',
                    impact: 'medium'
                });
            }
        });
        
        return recommendations;
    }
}
```

### Vector Search Optimization

```sql
-- Optimize vector similarity search
-- Use approximate search for better performance

-- Create IVFFlat index (faster but approximate)
CREATE INDEX idx_documents_embedding_ivfflat 
ON coach_documents 
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);

-- Function for optimized search
CREATE OR REPLACE FUNCTION fast_similarity_search(
    query_embedding vector,
    search_params JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    probe_count INTEGER := COALESCE((search_params->>'probes')::INTEGER, 10);
    limit_count INTEGER := COALESCE((search_params->>'limit')::INTEGER, 10);
BEGIN
    -- Set probes for accuracy/speed tradeoff
    SET LOCAL ivfflat.probes = probe_count;
    
    RETURN QUERY
    SELECT 
        d.id,
        d.content,
        1 - (d.embedding <=> query_embedding) as similarity
    FROM coach_documents d
    WHERE d.is_active = true
    ORDER BY d.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$;
```

## Monitoring and Alerts

```typescript
// Monitoring service
export class VectorDBMonitoring {
    async checkHealth(): Promise<HealthStatus> {
        const checks = await Promise.all([
            this.checkDiskSpace(),
            this.checkQueryLatency(),
            this.checkIndexHealth(),
            this.checkDocumentCount()
        ]);
        
        return {
            status: checks.every(c => c.healthy) ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date()
        };
    }
    
    private async checkDiskSpace(): Promise<HealthCheck> {
        const { data } = await this.supabase.rpc('get_table_sizes');
        const totalSize = data.reduce((sum, table) => sum + table.size_bytes, 0);
        const limitBytes = 10 * 1024 * 1024 * 1024; // 10GB
        
        return {
            name: 'disk_space',
            healthy: totalSize < limitBytes * 0.8,
            message: `Using ${(totalSize / 1024 / 1024 / 1024).toFixed(2)}GB of ${limitBytes / 1024 / 1024 / 1024}GB`,
            value: totalSize
        };
    }
}