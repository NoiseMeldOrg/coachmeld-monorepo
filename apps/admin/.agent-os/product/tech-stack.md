# Technical Stack

> Last Updated: 2025-07-23
> Version: 1.0.0

## Application Framework
**Next.js 14 (App Router) with TypeScript**
- Modern React framework with server-side rendering
- App Router for advanced routing and layouts
- TypeScript for type safety and developer experience

## Database System
**PostgreSQL with pgvector extension (Supabase)**
- Shared database instance with CoachMeld mobile app
- Vector embeddings support for RAG system
- Real-time subscriptions and RLS security

## JavaScript Framework
**React 18**
- Component-based UI architecture
- Server and client component patterns
- React Query for state management

## Import Strategy
**Node.js modules (npm)**
- Standard Node.js module resolution
- npm package manager for dependencies
- ES6 imports/exports throughout codebase

## CSS Framework
**Tailwind CSS**
- Utility-first CSS framework
- Custom design system integration
- Responsive design patterns

## UI Component Library
**shadcn/ui (Radix UI + Tailwind)**
- Accessible component primitives from Radix UI
- Tailwind CSS styling integration
- Consistent design system implementation

## Fonts Provider
**Default system fonts**
- System font stack for optimal performance
- No external font dependencies

## Icon Library
**Lucide (via shadcn/ui)**
- Comprehensive icon set
- React component integration
- Consistent visual language

## Application Hosting
**Not currently deployed (n/a)**
- Local development environment
- Deployment platform to be determined

## Database Hosting
**Supabase**
- Managed PostgreSQL with pgvector
- Integrated authentication and real-time features
- Shared instance with CoachMeld mobile app

## Asset Hosting
**No external assets currently (n/a)**
- Static assets served via Next.js
- No CDN or external storage configured

## Deployment Solution
**Not currently configured (n/a)**
- CI/CD pipeline to be implemented
- Deployment automation pending

## Code Repository
**GitHub**
- Repository URL: https://github.com/NoiseMeldOrg/coach-meld-admin
- Version control and collaboration platform
- Integration with development workflow

## Additional Technologies

### Vector Embeddings
**Google Gemini API**
- 768-dimensional vector embeddings
- Text processing for semantic search
- Integration with RAG system

### Authentication
**Supabase Auth**
- User authentication and authorization
- Row Level Security (RLS) policies
- Session management

### Real-time Features
**Supabase Realtime**
- Live dashboard updates
- Real-time notifications
- WebSocket-based communication

### YouTube Integration
**YouTube Transcript APIs**
- youtube-transcript and youtubei.js libraries
- Batch video processing capabilities
- Transcript extraction and processing