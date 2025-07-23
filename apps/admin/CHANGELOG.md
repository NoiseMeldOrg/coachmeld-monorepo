# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Upcoming features: Real-time subscriptions, extended audit logging, RBAC

## [0.3.0] - 2025-07-07

### Added
- Coach document access mapping with default Pro tier for all coaches
- Coach selection UI on all document upload interfaces (file upload, YouTube, RAG page)
- Comprehensive duplicate prevention system for RAG documents
- Database statistics dashboard showing table sizes, activity metrics, and usage trends
- Real-time duplicate detection with user warnings before upload
- Bulk upload functionality consolidated into RAG page
- Storage usage estimates and billing impact insights
- Activity metrics for messages, users, documents, and analytics events
- Type synchronization with CoachMeld database schema

### Changed
- Diet type field now informational only - removed from all business logic
- Improved YouTube playlist processing with better error handling and status tracking
- Enhanced upload UI with drag-and-drop moved above coach selection
- Navigation reordered for better user experience
- Database page transformed from query editor to statistics dashboard

### Fixed
- Fixed document counts showing 0 by using service role client to bypass RLS
- Synced with latest CoachMeld schema changes
- Fixed infinite loop in CoachAccessSelector component
- Improved error messages for YouTube videos without transcripts

### Removed
- Migrations page and database query functionality (no longer needed)
- Diet type dependencies from coach mapping and document access logic
- Separate Bulk Upload page (functionality moved to RAG page)

## [0.2.0] - 2025-07-05

### Added
- GDPR deletion request management system (Article 17 compliance)
- Integration with CoachMeld mobile app for deletion requests
- Request dashboard at `/dashboard/gdpr` with filtering and search
- SLA monitoring with 30-day deadline tracking and overdue alerts
- Manual deletion workflow with verification steps
- CSV export functionality for compliance reporting
- Auto-refresh capability (30-second intervals) for pending requests
- Sidebar badges showing pending GDPR request count
- Full audit trail for all GDPR actions
- @noisemeld.com email restriction for enhanced security
- Request status management (pending, processing, completed, failed, cancelled)
- Mobile app deletion dialog with special handling
- Admin notes and manual deletion confirmation
- New API endpoints: `/api/gdpr/requests`, `/api/gdpr/delete`, `/api/gdpr/export`
- GDPR-specific TypeScript types and interfaces
- Database tables: `gdpr_requests` and `gdpr_audit_logs`
- Migration: `004_create_gdpr_tables.sql`
- Comprehensive coach management system with CRUD operations
- Coach search, filter, and metrics dashboard
- Coach configuration editing with AI provider selection
- Coach document access management interface
- Coach prompting strategies editor
- Real-time coach performance metrics
- Coach management API endpoints

### Changed
- Updated documentation for GDPR compliance and v0.2.0 release
- Enhanced coordination documentation for shared database with coach-meld
- Improved CLAUDE.md with more detailed instructions

### Fixed
- Fixed CASCADE DELETE issue that was deleting account deletion requests when users were manually deleted from Supabase
- Added migration 008_fix_cascade_delete.sql to change foreign key constraint from CASCADE to SET NULL
- This preserves deletion requests for audit trail as required by GDPR compliance
- Synced with CoachMeld schema changes (document_sources.title field)
- Fixed compatibility issues with Next.js 15 and Tailwind CSS updates
- Resolved TypeScript errors across multiple components

## [0.1.0] - 2024-12-27

### Added
- Real-time dashboard statistics from live database
- Integration with CoachMeld's existing database tables (document_sources, coach_documents)
- User management with Supabase auth.users integration
- Automatic type syncing from CoachMeld migrations (`npm run sync-types`)
- CI/CD pipeline with GitHub Actions
- PR template for consistent contributions
- Release automation workflow
- Dashboard stats API endpoint (`/api/dashboard/stats`)
- User listing API with statistics (`/api/users/list`)
- Document grouping by source with expandable chunk views
- File hash-based duplicate detection for uploads
- Soft delete functionality for documents
- Test user creation and management system
- ESLint and TypeScript build checks in CI

### Changed
- Replaced all mock data with live database queries
- Updated API routes to use coach_documents and document_sources tables
- Improved error handling with proper TypeScript types
- Enhanced upload process with deduplication checks
- Migrated from hardcoded stats to real-time calculations
- Updated document search to use search_coach_documents function

### Fixed
- Dashboard now shows actual document counts from database
- YouTube page displays real transcript processing status
- User statistics accurately reflect auth.users data
- TypeScript errors across all components
- ESLint warnings for React hooks and unescaped entities
- Build errors with proper type assertions and promise handling


[Unreleased]: https://github.com/NoiseMeldOrg/coach-meld-admin/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/NoiseMeldOrg/coach-meld-admin/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/NoiseMeldOrg/coach-meld-admin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/NoiseMeldOrg/coach-meld-admin/releases/tag/v0.1.0