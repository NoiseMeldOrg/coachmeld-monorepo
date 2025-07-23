# CoachMeld Knowledge Base Management Guide

## Table of Contents
1. [Overview](#overview)
2. [Supported Document Formats](#supported-document-formats)
3. [Adding Your Research Data](#adding-your-research-data)
4. [Document Organization](#document-organization)
5. [Chunking Strategies](#chunking-strategies)
6. [Metadata Schemas](#metadata-schemas)
7. [Coach-Specific Content](#coach-specific-content)
8. [Best Practices](#best-practices)

## Overview

The CoachMeld Knowledge Base system allows you to integrate your own research, guides, protocols, and other documents into the AI coaches' knowledge. This guide explains how to prepare, organize, and import your content for optimal retrieval and response quality.

## Supported Document Formats

### 1. PDF Documents (.pdf)
```typescript
// PDF processing configuration
{
    format: 'pdf',
    maxSize: '50MB',
    processing: {
        extractText: true,
        extractImages: false, // Future feature
        preserveFormatting: true,
        extractMetadata: true
    }
}
```

**Best for:**
- Research papers
- Clinical studies
- Formal protocols
- Books and lengthy guides

### 2. Markdown Files (.md)
```typescript
// Markdown processing configuration
{
    format: 'markdown',
    maxSize: '10MB',
    processing: {
        preserveHeaders: true,
        convertToPlainText: true,
        extractCodeBlocks: true,
        preserveLinks: true
    }
}
```

**Best for:**
- Technical documentation
- Structured guides
- FAQ documents
- Protocol descriptions

### 3. Plain Text Files (.txt)
```typescript
// Text processing configuration
{
    format: 'text',
    maxSize: '10MB',
    processing: {
        encoding: 'UTF-8',
        normalizeWhitespace: true,
        detectSections: true
    }
}
```

**Best for:**
- Simple notes
- Transcripts
- Quick references
- Data exports

### 4. Word Documents (.docx)
```typescript
// DOCX processing configuration
{
    format: 'docx',
    maxSize: '25MB',
    processing: {
        extractText: true,
        preserveFormatting: true,
        extractTables: true,
        extractHeaders: true
    }
}
```

**Best for:**
- Formatted guides
- Reports
- Collaborative documents
- Templates

### 5. Web Content (URLs)
```typescript
// Web scraping configuration
{
    format: 'url',
    processing: {
        respectRobotsTxt: true,
        extractMainContent: true,
        removeAds: true,
        preserveStructure: true,
        updateFrequency: 'monthly'
    }
}
```

**Best for:**
- Blog posts
- Online articles
- Dynamic content
- Reference websites

## Adding Your Research Data

### Method 1: Web Interface Upload

```typescript
// Example: Upload research paper via UI
const uploadResearch = async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('metadata', JSON.stringify({
        coach_id: 'carnivore',
        title: 'Effects of Carnivore Diet on Metabolic Health',
        author: 'Dr. Sarah Johnson',
        publication_date: '2024-01-15',
        document_type: 'research',
        tags: ['metabolism', 'carnivore', 'health', 'study'],
        access_tier: 'premium',
        key_findings: [
            'Improved insulin sensitivity',
            'Reduced inflammation markers',
            'Enhanced mental clarity'
        ]
    }));
    
    const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
    });
    
    return response.json();
};
```

### Method 2: Bulk Import via CLI

```bash
# Import all PDFs from a research folder
npm run import-research -- \
  --coach-id carnivore \
  --folder ./research/carnivore-studies \
  --access-tier premium \
  --tags "carnivore,research,health"

# Import with custom metadata mapping
npm run import-research -- \
  --coach-id fitness \
  --folder ./research/fitness-protocols \
  --metadata-file ./metadata/fitness-mapping.json
```

### Method 3: API Integration

```typescript
// Programmatic document upload
import { CoachMeldAPI } from '@coachmeld/api-client';

const api = new CoachMeldAPI({
    apiKey: process.env.COACHMELD_API_KEY
});

// Upload single document
await api.documents.upload({
    coachId: 'carnivore',
    file: documentBuffer,
    metadata: {
        title: 'Carnivore Diet Implementation Guide',
        documentType: 'guide',
        accessTier: 'free',
        sections: [
            'Getting Started',
            'Food Selection',
            'Meal Planning',
            'Troubleshooting'
        ]
    }
});

// Batch upload
await api.documents.batchUpload([
    { file: doc1, metadata: {...} },
    { file: doc2, metadata: {...} },
    { file: doc3, metadata: {...} }
]);
```

### Method 4: Direct Database Import

```sql
-- Direct SQL import for advanced users
INSERT INTO document_sources (
    coach_id,
    title,
    source_type,
    metadata
) VALUES (
    'carnivore',
    'Comprehensive Carnivore Research Database',
    'pdf',
    jsonb_build_object(
        'author', 'Research Team',
        'year', 2024,
        'pages', 450,
        'topics', ARRAY['nutrition', 'health', 'protocols']
    )
);
```

## Document Organization

### Recommended Folder Structure

```
/research
├── /carnivore
│   ├── /studies
│   │   ├── metabolic-health-2024.pdf
│   │   ├── inflammation-markers.pdf
│   │   └── mental-clarity-research.pdf
│   ├── /guides
│   │   ├── beginner-guide.md
│   │   ├── meal-planning.docx
│   │   └── troubleshooting-faq.md
│   ├── /protocols
│   │   ├── adaptation-protocol.txt
│   │   └── supplementation-guide.pdf
│   └── /metadata.json
├── /fitness
│   ├── /training-programs
│   ├── /recovery-protocols
│   └── /nutrition-timing
└── /mindfulness
    ├── /meditation-techniques
    ├── /stress-research
    └── /practice-guides
```

### Metadata File Format

```json
{
  "documents": [
    {
      "filename": "metabolic-health-2024.pdf",
      "title": "Metabolic Health Improvements on Carnivore Diet",
      "author": "Dr. Sarah Johnson et al.",
      "publication_date": "2024-01-15",
      "journal": "Journal of Nutritional Science",
      "doi": "10.1234/jns.2024.001",
      "tags": ["metabolism", "insulin", "carnivore"],
      "access_tier": "premium",
      "summary": "12-month study showing significant metabolic improvements",
      "key_findings": [
        "73% improvement in insulin sensitivity",
        "45% reduction in inflammatory markers",
        "Normalized blood pressure in 89% of participants"
      ],
      "relevance_score": 0.95
    }
  ]
}
```

## Chunking Strategies

### 1. Semantic Chunking

```typescript
// Semantic chunking based on content structure
export class SemanticChunker {
    chunkDocument(text: string): Chunk[] {
        const chunks: Chunk[] = [];
        const sections = this.detectSections(text);
        
        sections.forEach(section => {
            if (section.length > this.maxChunkSize) {
                // Split large sections by paragraphs
                const paragraphs = this.splitByParagraphs(section);
                chunks.push(...this.combineSmallChunks(paragraphs));
            } else {
                chunks.push({
                    content: section,
                    type: 'section',
                    metadata: this.extractSectionMetadata(section)
                });
            }
        });
        
        return chunks;
    }
    
    private detectSections(text: string): string[] {
        // Detect sections by headers, topics, or natural breaks
        const sectionPatterns = [
            /^#{1,3}\s+(.+)$/gm,  // Markdown headers
            /^[A-Z][^.!?]*:$/gm,  // Title case headers
            /\n\n\n+/g             // Multiple line breaks
        ];
        
        // Implementation details...
        return sections;
    }
}
```

### 2. Fixed-Size Chunking with Overlap

```typescript
// Fixed-size chunking for consistent retrieval
export class FixedSizeChunker {
    private chunkSize = 1000;  // tokens
    private overlap = 200;     // tokens
    
    chunkDocument(text: string): Chunk[] {
        const tokens = this.tokenize(text);
        const chunks: Chunk[] = [];
        
        for (let i = 0; i < tokens.length; i += this.chunkSize - this.overlap) {
            const chunkTokens = tokens.slice(i, i + this.chunkSize);
            chunks.push({
                content: this.detokenize(chunkTokens),
                startIndex: i,
                endIndex: i + chunkTokens.length,
                metadata: {
                    position: chunks.length,
                    total: Math.ceil(tokens.length / (this.chunkSize - this.overlap))
                }
            });
        }
        
        return chunks;
    }
}
```

### 3. Hybrid Chunking Strategy

```typescript
// Combine semantic and fixed-size approaches
export class HybridChunker {
    chunkDocument(document: Document): Chunk[] {
        const chunks: Chunk[] = [];
        
        // First, split by major sections
        const sections = this.semanticSplit(document.content);
        
        sections.forEach((section, sectionIndex) => {
            // Then apply size constraints
            if (this.getTokenCount(section.content) <= this.maxChunkSize) {
                chunks.push({
                    ...section,
                    metadata: {
                        ...section.metadata,
                        sectionIndex,
                        chunkIndex: 0,
                        totalChunksInSection: 1
                    }
                });
            } else {
                // Split large sections with overlap
                const subChunks = this.splitWithOverlap(section.content);
                subChunks.forEach((subChunk, chunkIndex) => {
                    chunks.push({
                        content: subChunk,
                        metadata: {
                            ...section.metadata,
                            sectionIndex,
                            chunkIndex,
                            totalChunksInSection: subChunks.length
                        }
                    });
                });
            }
        });
        
        return chunks;
    }
}
```

## Metadata Schemas

### Core Metadata Schema

```typescript
interface DocumentMetadata {
    // Required fields
    id: string;
    coach_id: string;
    title: string;
    content_hash: string;
    created_at: Date;
    updated_at: Date;
    
    // Document classification
    document_type: 'research' | 'guide' | 'protocol' | 'case_study' | 'reference';
    access_tier: 'free' | 'premium' | 'pro';
    
    // Content metadata
    author?: string;
    publication_date?: Date;
    source_url?: string;
    doi?: string;
    
    // Categorization
    tags: string[];
    topics: string[];
    keywords: string[];
    
    // Quality and relevance
    relevance_score?: number;  // 0-1
    quality_score?: number;    // 0-1
    peer_reviewed?: boolean;
    evidence_level?: 'high' | 'medium' | 'low';
    
    // Usage tracking
    retrieval_count?: number;
    last_retrieved?: Date;
    helpfulness_score?: number;
}
```

### Coach-Specific Metadata Extensions

```typescript
// Carnivore coach metadata
interface CarnivoreMetadata extends DocumentMetadata {
    meat_types?: string[];
    health_conditions_addressed?: string[];
    adaptation_phase?: 'beginner' | 'adapted' | 'advanced';
    dietary_approach?: 'strict' | 'relaxed' | 'lion';
}

// Fitness coach metadata
interface FitnessMetadata extends DocumentMetadata {
    exercise_types?: string[];
    fitness_level?: 'beginner' | 'intermediate' | 'advanced';
    equipment_needed?: string[];
    duration_minutes?: number;
    muscle_groups?: string[];
}

// Mindfulness coach metadata
interface MindfulnessMetadata extends DocumentMetadata {
    meditation_type?: string;
    duration_minutes?: number;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    mental_health_focus?: string[];
}
```

## Coach-Specific Content

### Carnivore Coach Knowledge Base

```typescript
// Carnivore-specific document categories
const carnivoreCategories = {
    research: {
        topics: [
            'metabolic_health',
            'autoimmune_conditions',
            'mental_health',
            'athletic_performance',
            'weight_management'
        ],
        required_metadata: ['study_type', 'sample_size', 'duration']
    },
    
    guides: {
        topics: [
            'getting_started',
            'meal_planning',
            'shopping_lists',
            'restaurant_navigation',
            'social_situations'
        ],
        required_metadata: ['difficulty_level', 'time_required']
    },
    
    protocols: {
        topics: [
            'adaptation_protocol',
            'fat_protein_ratios',
            'electrolyte_management',
            'supplement_guidance',
            'troubleshooting'
        ],
        required_metadata: ['phase', 'duration', 'prerequisites']
    },
    
    case_studies: {
        topics: [
            'success_stories',
            'health_transformations',
            'athletic_achievements',
            'medical_reversals'
        ],
        required_metadata: ['age', 'gender', 'duration', 'conditions']
    }
};
```

### Content Quality Guidelines

```typescript
// Document quality checklist
export class DocumentQualityChecker {
    async assessDocument(document: Document): Promise<QualityReport> {
        const checks = await Promise.all([
            this.checkCompleteness(document),
            this.checkAccuracy(document),
            this.checkRelevance(document),
            this.checkReadability(document),
            this.checkCitations(document)
        ]);
        
        return {
            overallScore: this.calculateScore(checks),
            checks,
            recommendations: this.generateRecommendations(checks)
        };
    }
    
    private checkCompleteness(doc: Document): QualityCheck {
        const required = ['title', 'author', 'date', 'summary'];
        const missing = required.filter(field => !doc.metadata[field]);
        
        return {
            name: 'completeness',
            passed: missing.length === 0,
            score: (required.length - missing.length) / required.length,
            issues: missing.map(field => `Missing ${field}`)
        };
    }
    
    private checkAccuracy(doc: Document): QualityCheck {
        // Check for peer review, citations, evidence level
        const indicators = {
            peerReviewed: doc.metadata.peer_reviewed,
            hasCitations: doc.content.includes('References'),
            hasData: /\d+%|\d+\s+participants/.test(doc.content)
        };
        
        return {
            name: 'accuracy',
            passed: Object.values(indicators).filter(Boolean).length >= 2,
            score: Object.values(indicators).filter(Boolean).length / 3,
            issues: []
        };
    }
}
```

## Best Practices

### 1. Document Preparation

```typescript
// Document preparation checklist
export const documentPreparationChecklist = {
    content: [
        'Remove advertisements and unrelated content',
        'Fix formatting issues and special characters',
        'Ensure UTF-8 encoding',
        'Verify all sections are complete'
    ],
    
    metadata: [
        'Add descriptive title',
        'Include author information',
        'Set appropriate access tier',
        'Add relevant tags and keywords',
        'Include publication date'
    ],
    
    structure: [
        'Use clear section headers',
        'Maintain logical flow',
        'Include summary or abstract',
        'Add table of contents for long documents'
    ],
    
    quality: [
        'Verify factual accuracy',
        'Check for completeness',
        'Ensure relevance to coach specialty',
        'Update outdated information'
    ]
};
```

### 2. Optimal Chunk Sizes

```typescript
// Recommended chunk sizes by document type
export const chunkSizeRecommendations = {
    research_papers: {
        size: 1000,  // tokens
        overlap: 200,
        strategy: 'semantic',
        reason: 'Preserve complete findings and methodology'
    },
    
    guides: {
        size: 800,
        overlap: 150,
        strategy: 'hybrid',
        reason: 'Balance between context and specificity'
    },
    
    protocols: {
        size: 600,
        overlap: 100,
        strategy: 'steps',
        reason: 'Keep individual steps intact'
    },
    
    faqs: {
        size: 400,
        overlap: 50,
        strategy: 'qa_pairs',
        reason: 'Maintain question-answer pairs'
    }
};
```

### 3. Metadata Best Practices

```typescript
// Metadata enrichment service
export class MetadataEnrichmentService {
    async enrichMetadata(document: Document): Promise<EnrichedDocument> {
        const enriched = { ...document };
        
        // Auto-extract keywords
        enriched.metadata.keywords = await this.extractKeywords(document.content);
        
        // Generate summary if missing
        if (!enriched.metadata.summary) {
            enriched.metadata.summary = await this.generateSummary(document.content);
        }
        
        // Calculate relevance score
        enriched.metadata.relevance_score = await this.calculateRelevance(
            document,
            enriched.metadata.coach_id
        );
        
        // Add semantic tags
        enriched.metadata.semantic_tags = await this.generateSemanticTags(
            document.content,
            enriched.metadata.keywords
        );
        
        return enriched;
    }
}
```

### 4. Version Control

```typescript
// Document version control
export class DocumentVersionControl {
    async updateDocument(
        documentId: string,
        updates: DocumentUpdate
    ): Promise<void> {
        // Always preserve previous versions
        await this.createBackup(documentId);
        
        // Track changes
        const changelog = await this.generateChangelog(documentId, updates);
        
        // Update with new version
        await this.applyUpdates(documentId, {
            ...updates,
            version: await this.getNextVersion(documentId),
            changelog,
            updated_at: new Date()
        });
        
        // Re-index if content changed
        if (updates.content) {
            await this.reindexDocument(documentId);
        }
    }
}
```

### 5. Quality Assurance Process

```markdown
## Document QA Checklist

### Before Import
- [ ] Verify document authenticity and source
- [ ] Check for copyright compliance
- [ ] Ensure content is appropriate for coach specialty
- [ ] Remove any personally identifiable information (PII)

### During Processing
- [ ] Validate successful text extraction
- [ ] Verify chunk boundaries preserve meaning
- [ ] Confirm metadata accuracy
- [ ] Test embedding generation

### After Import
- [ ] Run test queries to verify retrieval
- [ ] Check relevance scores
- [ ] Validate access control (free vs premium)
- [ ] Monitor initial usage metrics

### Periodic Review
- [ ] Update outdated information
- [ ] Review retrieval performance
- [ ] Gather user feedback
- [ ] Optimize based on usage patterns
```

This comprehensive knowledge base guide provides everything needed to effectively manage and optimize your coach-specific content for the RAG system.