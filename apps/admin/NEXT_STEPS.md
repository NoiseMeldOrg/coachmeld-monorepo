# CoachMeld Admin Dashboard - Next Steps

## Current Status
- ✅ Repository created: https://github.com/NoiseMeldOrg/coach-meld-admin
- ✅ Next.js 14 project initialized with TypeScript and Tailwind CSS
- ✅ Basic authentication with Supabase
- ✅ Backstage-inspired layout with sidebar navigation
- ✅ Core UI components from shadcn/ui
- ✅ Basic pages created: Dashboard, RAG, YouTube, Users

## Immediate Next Steps

### 1. Complete API Implementation
- [x] Finish `/api/rag/upload` route with actual embedding generation
- [x] Create `/api/rag/search` for vector search
- [x] Create `/api/rag/documents` for listing documents
- [x] Create `/api/youtube/process` for playlist processing
- [x] Create `/api/users/create-test` for test user creation
- [x] Add real-time updates for dashboard data

### 2. Database Integration
- [x] Create SQL migration runner UI at `/dashboard/migrations`
- [x] Add database query console at `/dashboard/database`
- [ ] Implement real-time updates using Supabase subscriptions
- [ ] Add RLS policies check interface

### 3. RAG System Features
- [x] Implement document chunking strategy (1000 char chunks with 200 char overlap)
- [x] Add bulk document upload interface at `/dashboard/upload`
- [ ] Create embedding visualization/debugging tools
- [x] Add diet-specific document filtering
- [x] Implement document deletion with cascade to embeddings

### 4. YouTube Features
- [ ] Integrate YouTube Data API for playlist info
- [x] Add progress tracking for batch downloads
- [ ] Implement retry logic for failed transcripts
- [ ] Add transcript preview before processing
- [ ] Create scheduled playlist sync feature

### 5. Real-time Updates
- [x] Implement Supabase real-time subscriptions
- [x] Add real-time document source updates
- [x] Add real-time coach document updates
- [x] Create real-time dashboard statistics
- [x] Add visual indicators for live updates

### 6. Knowledge Base Management
- [x] Create interface at `/dashboard/knowledge` for diet-specific content
- [x] Add CRUD operations for knowledge entries
- [ ] Implement content versioning
- [x] Add bulk import/export functionality

### 7. Developer Tools
- [x] Add API documentation browser
- [ ] Create webhook management interface
- [ ] Add feature flag management
- [x] Implement log viewer with filtering
- [ ] Add performance profiling tools

### 8. UI/UX Improvements
- [ ] Add loading skeletons for better UX
- [ ] Implement real-time notifications
- [ ] Add keyboard shortcuts
- [ ] Create command palette (cmd+k)
- [ ] Add breadcrumb navigation

### 9. Security & Permissions
- [ ] Implement role-based access control
- [ ] Add audit logging for all actions
- [ ] Create admin user management
- [ ] Add 2FA support
- [ ] Implement API key management

### 10. Missing Components to Create
- [ ] Badge component (`/components/ui/badge.tsx`)
- [ ] Dialog component for modals
- [ ] Table component for data display
- [ ] Progress component for uploads
- [ ] Command component for search

## Environment Variables Needed
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
YOUTUBE_API_KEY=
```

## Key Files to Reference from CoachMeld
- `/scripts/add-document-to-rag.js` - Document upload logic
- `/scripts/search-rag.js` - Search implementation
- `/scripts/add-youtube-video.ts` - YouTube processing
- `/src/services/geminiEmbeddings.ts` - Embedding generation
- `/src/services/ragService.ts` - RAG operations

## Testing Checklist
- [ ] Test document upload with PDF, TXT, MD files
- [ ] Verify embedding generation and storage
- [ ] Test YouTube playlist processing
- [ ] Verify user management features
- [ ] Test search functionality
- [ ] Check responsive design
- [ ] Test dark/light mode switching

## Deployment Considerations
- Use Vercel for hosting
- Set up GitHub Actions for CI/CD
- Configure environment variables in Vercel
- Enable Vercel Analytics
- Set up error monitoring (Sentry)

## Future Enhancements
- GraphQL API for better data fetching
- Implement caching strategy with Redis
- Add export functionality for all data
- Create mobile-responsive admin app
- Add multi-language support
- Implement backup/restore functionality