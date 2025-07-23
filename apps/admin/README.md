# CoachMeld Admin Dashboard

A comprehensive administrative dashboard for managing the CoachMeld RAG (Retrieval-Augmented Generation) system with GDPR compliance capabilities, built with Next.js 14, TypeScript, and Supabase.

**Current Version**: v0.2.0

## Overview

This admin dashboard integrates directly with CoachMeld's existing database structure, providing a unified interface for managing documents, users, and system analytics. It uses the same Supabase instance as the main CoachMeld application, ensuring data consistency and real-time updates.

## Features

### 🔍 RAG System Management
- **Document Management**: Upload, search, and manage documents with automatic chunking and embedding generation
- **Source Grouping**: Documents are organized by source with expandable chunk views
- **Duplicate Detection**: Automatic file hash-based deduplication prevents redundant uploads
- **Bulk Upload**: Process multiple documents simultaneously with progress tracking
- **Vector Search**: Semantic search using coach_documents table with similarity scoring
- **Soft Delete**: Documents are marked as inactive rather than permanently deleted

### 📹 YouTube Integration
- **Transcript Processing**: Download and process transcripts from YouTube videos and playlists
- **Batch Operations**: Process entire playlists with automatic retry for failed videos
- **Progress Tracking**: Real-time progress updates for batch transcript processing

### 👥 User Management
- **User Dashboard**: View all Supabase auth.users with real-time statistics
- **User Stats**: Track confirmed/unconfirmed users and recent activity
- **Test Users**: Create and manage test users with metadata flags
- **Search & Filter**: Find users by email or metadata attributes
- **Activity Tracking**: Monitor last sign-in times and account creation dates

### 📊 Analytics Dashboard
- **Event Tracking**: Monitor user interactions and system events
- **Performance Metrics**: Track query response times and success rates
- **Popular Topics**: Analyze most searched queries and topics
- **User Activity**: Monitor DAU, WAU, and MAU metrics

### 🗄️ Database Tools
- **Query Console**: Execute SQL queries with syntax highlighting
- **Migration Runner**: Manage database schema changes
- **Saved Queries**: Store and reuse common queries
- **Query History**: Track all executed queries

### 📚 Knowledge Base
- **Content Management**: Create and edit diet-specific knowledge entries
- **Categorization**: Organize content by category and tags
- **Version Control**: Track changes to knowledge entries
- **Import/Export**: Bulk import and export knowledge data

### 🔧 Developer Tools
- **API Documentation**: Interactive API reference with examples
- **System Logs**: Real-time log streaming with filtering
- **Performance Monitoring**: CPU, memory, and disk usage metrics
- **Settings Management**: Configure application settings and API keys

### 🛡️ GDPR Compliance (NEW in v0.2.0)
- **Deletion Request Management**: Complete Article 17 (Right to Erasure) compliance
- **Mobile App Integration**: Seamlessly handles deletion requests from CoachMeld mobile app
- **SLA Monitoring**: Track 30-day compliance deadline with overdue alerts
- **Request Dashboard**: Filter, search, and manage all GDPR requests
- **Manual Deletion Workflow**: Secure verification process for data deletion
- **CSV Export**: Generate compliance reports for auditing
- **Auto-refresh**: Real-time updates every 30 seconds
- **Audit Trail**: Complete logging of all GDPR-related actions
- **@noisemeld.com Restriction**: Enhanced security with email domain validation

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with pgvector extension (shared with CoachMeld)
- **Vector Embeddings**: Google Gemini (768 dimensions)
- **State Management**: React Query for server state
- **Styling**: Tailwind CSS with custom design system
- **Type Safety**: Automatic type generation from CoachMeld migrations

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/NoiseMeldOrg/coach-meld-admin.git
cd coach-meld-admin
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.local.example .env.local
```

4. Fill in your environment variables:
- Get Supabase credentials from your CoachMeld project
- Configure Supabase connection
- Add Gemini API key for embeddings

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
coach-meld-admin/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── analytics/        # Analytics endpoints
│   │   ├── database/         # Database query endpoints
│   │   ├── gdpr/             # GDPR compliance endpoints (NEW)
│   │   ├── knowledge/        # Knowledge base CRUD
│   │   ├── rag/              # RAG system endpoints
│   │   ├── users/            # User management
│   │   └── youtube/          # YouTube processing
│   ├── dashboard/            # Dashboard pages
│   │   ├── analytics/        # Analytics dashboard
│   │   ├── api/              # API documentation
│   │   ├── database/         # Database tools
│   │   ├── gdpr/             # GDPR request management (NEW)
│   │   ├── knowledge/        # Knowledge base UI
│   │   ├── logs/             # System logs viewer
│   │   ├── migrations/       # Migration runner
│   │   ├── rag/              # RAG management
│   │   ├── settings/         # Settings page
│   │   ├── upload/           # Bulk upload
│   │   ├── users/            # User management
│   │   └── youtube/          # YouTube tools
│   └── layout.tsx            # Root layout
├── components/               # React components
│   ├── gdpr/                 # GDPR-specific components (NEW)
│   ├── layout/               # Layout components
│   └── ui/                   # UI components (shadcn/ui)
├── lib/                      # Utility libraries
│   ├── supabase/             # Supabase clients
│   └── utils.ts              # Helper functions
├── services/                 # Service modules
│   ├── dashboard/            # Dashboard endpoints
│   ├── embeddings/           # Gemini embeddings
│   └── rag/                  # RAG utilities
├── types/                    # TypeScript types
│   ├── coachmeld.ts          # Auto-generated CoachMeld types
│   └── gdpr.ts               # GDPR-specific types (NEW)
└── public/                   # Static assets
```

## Database Integration

This admin dashboard connects directly to CoachMeld's existing database tables. No separate tables are required for the admin tool.

### Key Tables Used:
- **`document_sources`**: Stores original document metadata and content
- **`coach_documents`**: Stores document chunks with 768-dimensional embeddings
- **`coach_document_access`**: Many-to-many relationship for document access control
- **`auth.users`**: Supabase authentication users table
- **`gdpr_requests`**: GDPR request tracking with SLA monitoring (NEW in v0.2.0)
- **`gdpr_audit_logs`**: Comprehensive audit trail for GDPR actions (NEW in v0.2.0)

### Required Migrations:

The admin tool includes migrations that need to be run in your Supabase SQL editor:

```bash
# 1. Vector search function:
supabase/migrations/003_create_coach_search_function.sql

# 2. GDPR compliance tables (NEW in v0.2.0):
supabase/migrations/004_create_gdpr_tables.sql
```

These migrations create:
- `search_coach_documents` function for vector similarity search
- `gdpr_requests` table for tracking deletion requests
- `gdpr_audit_logs` table for compliance audit trail

## API Endpoints

### RAG System
- `POST /api/rag/upload` - Upload documents
- `POST /api/rag/search` - Vector search
- `GET /api/rag/documents` - List documents
- `DELETE /api/rag/documents` - Delete documents

### YouTube
- `POST /api/youtube/process` - Process transcripts
- `GET /api/youtube/process` - Check processing status

### Analytics
- `POST /api/analytics/events` - Track events
- `GET /api/analytics/events` - Retrieve analytics
- `DELETE /api/analytics/events` - Clean up old events

### Users
- `POST /api/users/create-test` - Create test users
- `GET /api/users/create-test` - List test users
- `DELETE /api/users/create-test` - Delete test users
- `GET /api/users/list` - List all users with stats

### Dashboard
- `GET /api/dashboard/stats` - Get real-time dashboard statistics

### Knowledge Base
- `GET /api/knowledge` - List entries
- `POST /api/knowledge` - Create entry
- `PUT /api/knowledge` - Update entry
- `DELETE /api/knowledge` - Delete entry

### GDPR Compliance (NEW in v0.2.0)
- `GET /api/gdpr/requests` - List GDPR requests with filtering
- `POST /api/gdpr/requests` - Create new GDPR request
- `PUT /api/gdpr/requests/[id]` - Update request status/notes
- `DELETE /api/gdpr/requests/[id]` - Cancel GDPR request
- `POST /api/gdpr/delete` - Process deletion request
- `GET /api/gdpr/export` - Export requests as CSV

## Documentation

- **[Product Requirements](./PRODUCT_REQUIREMENTS.md)** - Comprehensive PRD for v1.0.0
- **[Product Roadmap](./PRODUCT_ROADMAP.md)** - Development timeline and milestones
- **[GDPR Implementation Plan](./GDPR_IMPLEMENTATION_PLAN.md)** - GDPR compliance roadmap
- **[Visual Roadmap](./docs/roadmap-visual.md)** - Visual timeline and diagrams
- **[Development Guide](./CLAUDE.md)** - Guidelines for Claude Code development
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions

## Security Considerations

- All API routes require authentication
- Service role key is only used server-side
- GDPR operations restricted to @noisemeld.com emails
- Complete audit trail for compliance
- Implement rate limiting for production
- Use environment variables for sensitive data
- Enable RLS policies in Supabase
- Implement proper CORS configuration
- Manual verification required for data deletion
- SLA monitoring ensures compliance deadlines

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is proprietary software owned by NoiseMeld.