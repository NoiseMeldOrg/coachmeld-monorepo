# Diet Coach Knowledge Base

This directory contains comprehensive knowledge bases for each diet coach in the CoachMeld app.

## Structure

Each diet coach has its own TypeScript file containing:
- **Core principles and philosophy**
- **Getting started guides**
- **Food lists and guidelines**
- **Troubleshooting tips**
- **Common questions and answers**
- **Advanced optimization strategies**

## Diet Coaches

1. **Carnivore Coach** (`carnivore.ts`)
   - Basic carnivore diet guidance
   - Focus on meat-only approach
   - Adaptation tips

2. **Carnivore Coach Pro** (`carnivorePro.ts`)
   - Advanced carnivore strategies
   - Performance optimization
   - Healing protocols
   - Long-term sustainability

3. **Keto Coach** (`keto.ts`)
   - Ketogenic diet fundamentals
   - Macro calculations
   - Ketosis optimization

4. **Paleo Coach** (`paleo.ts`)
   - Ancestral eating patterns
   - Whole foods focus
   - Lifestyle integration

5. **Low Carb Coach** (`lowcarb.ts`)
   - Flexible carb restriction
   - Blood sugar management
   - Weight loss strategies

6. **Ketovore Coach** (`ketovore.ts`)
   - Carnivore-keto hybrid
   - Strategic plant inclusion
   - Best of both worlds

7. **Lion Diet Coach** (`lion.ts`)
   - Ultimate elimination diet
   - Ruminant meat only
   - Healing protocol

## Integration

The knowledge base is integrated with:
- **RAG System**: Knowledge is embedded and searchable via vector similarity
- **Coach Responses**: Direct access to knowledge for generating responses
- **FAQ Matching**: Quick answers to common questions

## Updating Knowledge

To update or add knowledge:
1. Edit the relevant coach file
2. Run the knowledge embedding script: `npm run populate-knowledge`
3. Test the changes in the chat interface

## Knowledge Categories

Each coach's knowledge is organized into categories:
- Core Principles
- Getting Started
- Food Guidelines
- Troubleshooting
- Common Mistakes
- Advanced Topics
- FAQs

This structure ensures comprehensive coverage while maintaining easy navigation and retrieval.