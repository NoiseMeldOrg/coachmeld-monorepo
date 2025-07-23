# Coach Content Directory Structure

This directory contains all coaching content organized by diet type. Each coach has their own subdirectory where relevant documents, guides, and resources are stored.

## Directory Structure

```
coach-content/
├── carnivore/          # Standard carnivore diet coach
│   └── carnivore-basics.md
├── carnivore-pro/      # Advanced carnivore diet coach (premium)
├── paleo/              # Paleo diet coach
│   └── paleo-basics.md
├── lowcarb/            # Low carb diet coach
│   └── lowcarb-basics.md
├── keto/               # Ketogenic diet coach
│   └── keto-basics.md
├── ketovore/           # Ketovore diet coach (keto + carnivore hybrid)
│   └── ketovore-basics.md
├── lion/               # Lion diet coach (most restrictive carnivore)
│   └── lion-basics.md
└── shared/             # Documents shared across multiple coaches
    └── Comprehensive Summary of the Proper Human Diet (PHD) Guidebook.md
```

## Content Organization

Each coach directory should contain:
- Core diet guidelines and principles
- Meal plans and recipes
- FAQs and troubleshooting guides
- Scientific references and studies
- Success stories and testimonials
- Video transcript summaries (if applicable)

## File Naming Convention

- Use descriptive names with hyphens: `carnivore-beginner-guide.md`
- Include version numbers for updated content: `meal-plan-v2.md`
- Prefix with date for time-sensitive content: `2024-01-weekly-tips.md`

## Content Sources

Content can come from:
1. Original authored content
2. Partner-provided materials (with proper attribution)
3. YouTube transcript summaries (processed through our system)
4. Community contributions (reviewed and approved)

## Adding New Content

When adding new content:
1. Place it in the appropriate coach directory
2. Ensure proper formatting (Markdown preferred)
3. Include metadata at the top of the file (author, date, source)
4. Update the coach's index file if one exists
5. Run any necessary processing scripts for RAG integration

## Shared Content

The `shared/` directory contains documents that are relevant to multiple coaches. Currently includes:
- **PHD Guidebook**: Comprehensive guide to the Proper Human Diet principles

## Uploading Content to RAG System

### Upload all basics documents:
```bash
./scripts/upload-all-basics.sh
```

### Upload a single document:
```bash
node scripts/add-document-to-rag.js "coach-content/[coach]/[document].md" --coach [coach-id] --title "[Title]"
```

### Upload shared document to all diet coaches:
```bash
./scripts/add-shared-document.sh "coach-content/shared/[document].md" "[Title]"
```

## Current Content

### Carnivore Coach
- `Comprehensive Summary of the Proper Human Diet (PHD) Guidebook.md` - Core guidebook for the carnivore/PHD approach

### Other Coaches
- Content to be added as it becomes available

## Integration with RAG System

Content in these directories is processed and embedded into our vector database for the RAG (Retrieval-Augmented Generation) system. See `/docs/RAG_SYSTEM_GUIDE.md` for details on how to add content to the knowledge base.