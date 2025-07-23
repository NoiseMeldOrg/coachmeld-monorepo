# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Always Review This Document
- **BEFORE ANY WORK**: Read this entire document before starting any task
- **AFTER CONVERSATION SUMMARIES**: Re-read after any context compaction
- **BEFORE CREATING PRS**: Review PR and commit guidelines
- **BEFORE RELEASES**: Review release process guidelines

## 🚨 CRITICAL: Check for Open PRs FIRST 🚨
**BEFORE starting ANY new feature or creating ANY branch:**
```bash
gh pr list --state open
```
If this shows ANY open PRs, you MUST NOT create new branches or PRs. Tell the user about the open PR instead.

## CRITICAL: One PR at a Time Rule
**ABSOLUTE RULE**: Only ONE pull request can be open at any time. 
- Always run `gh pr list --state open` BEFORE creating branches
- If a PR already exists, do NOT create another one
- Complete the current PR before starting any new work
- If asked to work on something new while a PR is open, remind the user about the existing PR

## 🚨 CRITICAL: NEVER Commit to Master Branch
**MANDATORY WORKFLOW**:
1. **FIRST**: Run `git branch` to check current branch
2. **IF on master**: IMMEDIATELY run `git checkout -b feat/task-name`
3. **NEVER EVER** make commits while on master branch
4. **ALL work** must be done on feature branches with PRs

## CRITICAL: Check for CoachMeld Schema Changes
**IMMEDIATELY when starting work on the admin tool**:
1. Check if CoachMeld has new or modified migrations:
   ```bash
   ls -la /home/intro/CoachMeld/coach-meld/supabase/migrations/*.sql | head -5
   ```
2. If you see recent migrations (check timestamps), run:
   ```bash
   npm run sync-types
   ```
3. If types changed, notify the user:
   ```
   "I detected new CoachMeld migrations and updated the TypeScript types."
   "The changes are in /types/coachmeld.ts - please review them."
   ```
4. Include any type changes in your next commit

## Developer Information
- **Timezone**: EST (Eastern Standard Time)
- **Company**: NoiseMeld
- **Role**: App Developer/Owner
- **Working Directory**: `/home/intro/CoachMeld/coach-meld-admin`

## Related Projects - CRITICAL COORDINATION REQUIRED

### Main Mobile App: coach-meld
- **Location**: `../coach-meld/` (sibling directory)
- **Description**: React Native mobile app that shares the same Supabase database
- **GitHub**: https://github.com/NoiseMeldOrg/coach-meld

### IMPORTANT: Shared Database Implications
**WARNING**: Both apps use the SAME Supabase project and database. Any database changes made in either app affect BOTH apps immediately.

#### Before Making Database Changes:
1. **Check the main app's migrations**: Look at `../coach-meld/supabase/migrations/` to see the current schema
2. **Coordinate schema changes**:
   - Database migrations should be created in the coach-meld repo (mobile app)
   - The admin app should adapt to schema changes, not drive them
   - If you need a schema change, ask the user to coordinate with the coach-meld Claude Code instance

#### Known Schema Updates:
- **Migration 048**: Changed `document_sources.source_name` to `document_sources.title`
  - All queries should use `title` not `source_name`
  - This was fixed in January 2025

#### Coordination Best Practices:
1. **Read-only first**: When possible, the admin app should be read-only or use existing schema
2. **Migration location**: All migrations go in `../coach-meld/supabase/migrations/`
3. **Type definitions**: Check `../coach-meld/src/lib/supabase.ts` for TypeScript types
4. **Communication**: When schema changes are needed, provide clear instructions for the user to relay to the coach-meld Claude Code instance

#### Key Shared Tables:
- `profiles` - User profiles
- `messages` - Chat messages
- `coaches` - Coach configurations
- `coach_documents` - RAG knowledge base documents
- `document_sources` - Document metadata (uses `title` not `source_name`)
- `subscriptions` - User subscription data
- `user_payment_methods` - Payment information

#### Development Workflow:
1. Always check if coach-meld repo has recent migrations
2. Run `ls ../coach-meld/supabase/migrations/` to see migration files
3. If schema changes are needed, create them in coach-meld repo
4. Update admin app to work with new schema

## Database Migration Responsibilities
- **coach-meld (mobile app)**: Owns all database migrations and schema changes
- **coach-meld-admin (this app)**: Consumes the database schema, should not create migrations

## Project Overview

CoachMeld Admin Dashboard is a comprehensive web application for managing the CoachMeld RAG (Retrieval-Augmented Generation) system. Built with Next.js 14, TypeScript, and Supabase, it provides administrative tools for document management, user administration, analytics, and system monitoring.

## Database Integration with CoachMeld

### IMPORTANT: This admin tool uses CoachMeld's database tables directly
The admin dashboard is integrated with CoachMeld's existing database structure:
- **`document_sources`**: Stores original document metadata
- **`coach_documents`**: Stores document chunks with embeddings
- **`coach_document_access`**: Many-to-many relationship for document access
- **No separate admin tables**: We query CoachMeld's tables directly

### Key Differences from Initial Design
- We DO NOT use `rag_documents` or `document_embeddings` tables
- Documents are grouped by source (one source can have multiple chunks)
- Soft delete is used (`is_active = false`) instead of hard delete
- File hash is used for duplicate detection

### Syncing Types with CoachMeld

#### AUTOMATIC CHECK REQUIRED
**You MUST check for schema changes**:
1. At the start of EVERY work session on the admin tool
2. Before creating any PR
3. When you see database-related errors
4. After the user mentions updating CoachMeld

#### Check Process
```bash
# 1. First, check if there are new migrations
find /home/intro/coach-meld-test/CoachMeld/supabase/migrations -name "*.sql" -newer /home/intro/coach-meld-test/coach-meld-admin/.last-migration-sync 2>/dev/null | head -5

# 2. If files are listed above, sync the types
npm run sync-types

# 3. Check if types changed
git diff --quiet types/coachmeld.ts || echo "Types have been updated"
```

#### When Types Change
If `sync-types` modifies `/types/coachmeld.ts`:
1. **Notify the user immediately**:
   ```
   "I've detected new CoachMeld database migrations and updated the TypeScript types."
   "Please review the changes in /types/coachmeld.ts"
   ```
2. **Include in your next commit** with message:
   ```
   "chore: sync types with CoachMeld schema changes"
   ```
3. **Test that the admin tool still works** with the new types

#### How the Sync Works
- Reads SQL migrations from `/home/intro/coach-meld-test/CoachMeld/supabase/migrations/`
- Parses CREATE TABLE and ALTER TABLE statements
- Generates TypeScript interfaces in `/types/coachmeld.ts`
- Only processes migrations newer than `.last-migration-sync`
- Focuses on document-related tables (document*, coach*, rag*, embed*)

**Note**: The parser may miss complex SQL - always review generated types

## Database Migrations

### CRITICAL: Migration Process
**IMPORTANT**: Migrations must be run BEFORE merging the PR, not after!

1. **Always notify the user IMMEDIATELY** when creating a new migration:
   ```
   "I've created a new database migration: `[filename]`"
   "**ACTION REQUIRED**: Please run this migration BEFORE merging the PR"
   ```
2. **Provide exact path**: Always give the full path to the migration file
3. **Explain the migration**: Tell the user what the migration does
4. **Include in PR description**: List all migrations that need to be run BEFORE merging

### Migration Workflow (CORRECT ORDER)
```
1. Review the PR
2. Run the migration(s) in Supabase Dashboard:
   - Go to SQL Editor
   - Copy and paste the contents of the migration file
   - Click "Run" to execute
   - Verify the migration succeeded
3. Test the feature locally with the migrated database
4. Only after successful testing, merge the PR
```

**Why this order matters**: If you merge before running migrations, the deployed code will fail because it expects database changes that don't exist yet.

### Migration Naming Convention
- Check existing migrations: `ls supabase/migrations/`
- Use sequential numbering: `XXX_description.sql`
- Example: `003_create_coach_search_function.sql`

### Current Migrations
- `001_create_admin_tables.sql` - Initial admin tables (mostly unused now)
- `003_create_coach_search_function.sql` - Vector search function for coach_documents

## Cross-Project Awareness
When working on database-related features:
1. ALWAYS check the main app's schema first: `../coach-meld/supabase/migrations/`
2. Use `title` field not `source_name` in document_sources table (fixed in migration 048)
3. Defer schema changes to the main coach-meld app
4. Focus on building admin UI that works with existing schema

## Git Workflow & PR Process

### CRITICAL: Release Process
When the user asks for a release:

1. **Check current version**:
   ```bash
   git describe --tags --abbrev=0
   ```

2. **Create release branch**:
   ```bash
   git checkout -b release/vX.Y.Z
   ```

3. **Update version in package.json**:
   ```json
   {
     "version": "X.Y.Z"
   }
   ```

4. **Create changelog** (if CHANGELOG.md exists):
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD
   
   ### Added
   - New features
   
   ### Changed
   - Updates to existing functionality
   
   ### Fixed
   - Bug fixes
   ```

5. **Commit version bump**:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to vX.Y.Z
   
   - Update package.json version
   - Add changelog entry for vX.Y.Z
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

6. **Create and push tag**:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin release/vX.Y.Z
   git push origin vX.Y.Z
   ```

7. **Create GitHub release**:
   ```bash
   gh release create vX.Y.Z --title "Release vX.Y.Z" --notes "$(cat <<'EOF'
   ## What's Changed
   
   ### Features
   - List new features
   
   ### Bug Fixes
   - List fixes
   
   ### Documentation
   - List docs updates
   
   **Full Changelog**: https://github.com/[owner]/[repo]/compare/vX.Y.Y...vX.Y.Z
   EOF
   )"
   ```

### Branch Strategy
- **ABSOLUTELY NEVER** commit directly to master - NO EXCEPTIONS
- **MANDATORY**: Always check current branch with `git branch` before ANY work
- **MANDATORY**: If on master, IMMEDIATELY create feature branch before making changes
- Create feature branches: `feat/feature-name`, `fix/bug-name`, `chore/task-name`
- Work exclusively on feature branches

### 🚨 CRITICAL: Pre-Work Branch Check
**BEFORE starting ANY task, you MUST:**
```bash
git branch
```
**If current branch is `master`:**
1. IMMEDIATELY create feature branch: `git checkout -b feat/descriptive-name`
2. NEVER make commits while on master branch
3. If you accidentally made changes on master, stash them and move to feature branch

**If current branch is NOT master:**
- Proceed with work on the existing feature branch

### Creating Pull Requests
1. **Create branch**: `git checkout -b feat/feature-name`
2. **Make changes and commit** with descriptive messages
3. **Push branch**: `git push -u origin feat/feature-name`
4. **Create PR with GitHub CLI**:
   ```bash
   gh pr create --title "feat: your feature description" --body "$(cat <<'EOF'
   ## Summary
   - Brief overview of changes
   - Key improvements made
   - Problems solved
   
   ## Key Changes
   
   ### API Routes
   - ✨ New endpoints created
   - 🔧 Configuration updates
   - 🔗 Integration improvements
   
   ### UI Components  
   - 🎨 Styling improvements
   - 📱 Responsive design updates
   - 🎯 Functional improvements
   
   ### Database
   - 📊 New migrations: `XXX_migration_name.sql`
   - 🔄 Schema updates
   - 🗄️ Data handling improvements
   
   ### Functionality Preserved
   - ✅ All existing features work as before
   - ✅ No breaking changes
   - ✅ Backward compatibility maintained
   
   ## Screenshots
   [Add screenshots if UI changes]
   
   ## Test Plan
   - [ ] Run development server and verify no errors
   - [ ] Test all modified API endpoints
   - [ ] Verify authentication still works
   - [ ] Check responsive design on mobile
   - [ ] Test error handling scenarios
   - [ ] Run any new migrations
   - [ ] Verify data persistence
   
   ## Database Migrations
   ⚠️ **ACTION REQUIRED**: Run these migrations BEFORE merging:
   - `supabase/migrations/XXX_migration_name.sql` - Description of what it does
   
   **Migration Order**:
   1. Review this PR
   2. Run the migration(s) in Supabase
   3. Test the feature locally
   4. Then merge the PR
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   EOF
   )"
   ```

### Commit Message Format
```
type: brief description

- Detailed change description
- Another change made
- Why these changes were necessary

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `build`

### Solo Developer Workflow Rules

#### 🚨 MANDATORY: CHECK FOR OPEN PRs BEFORE ANY NEW WORK 🚨
**BEFORE creating any feature branch or starting new work, you MUST:**
```bash
gh pr list --state open
```
If ANY PR is shown as open, you CANNOT create a new branch or PR. NO EXCEPTIONS.

#### CRITICAL: One PR Rule
**NEVER create a new PR while another PR is still open**. This is a strict rule with no exceptions.

1. **ALWAYS CHECK FIRST**: Run `gh pr list --state open` before ANY new work
   - If output shows any open PRs → STOP
   - Inform user: "There is an open PR (#X) that must be merged or closed first"
   - Do NOT proceed with new branches or features

2. **ONE PR AT A TIME**: Only have one open pull request
   - Do NOT create a new feature branch if a PR is already open
   - Do NOT switch to work on different features while a PR is pending
   - If asked to work on something new, remind the user that a PR is already open
   
3. **Complete PR before new work**: Finish current PR before starting next task
   - Wait for user to merge or close the current PR
   - Only after PR is merged/closed, proceed with new work
   
4. **Immediate notification**: Always tell user "PR #X is ready for testing"
   - Include the PR number and URL
   - Briefly summarize what the PR does
   
5. **Wait for feedback**: Don't start new work until PR is merged
   - Stay on the current feature branch
   - Make any requested changes to the same PR
   - Do NOT create additional PRs

### Post-PR Merge Workflow
**CRITICAL**: When user says PR is merged:
```bash
git checkout master
git pull origin master
# Delete the feature branch locally
git branch -d feat/branch-name
```

## Development Commands

**IMPORTANT**: Do NOT run `npm run dev` or other long-running processes from Claude Code. 
The user will run these commands in their terminal. Only use npm commands for quick checks like `npm run build` or `npm run lint`.

Always run from the project directory:
- `npm install` - Install dependencies
- `npm run dev` - Start development server (port 3000) - **RUN IN USER'S TERMINAL**
- `npm run build` - Build for production (OK to run for checking errors)
- `npm run start` - Start production server - **RUN IN USER'S TERMINAL**
- `npm run lint` - Run ESLint (OK to run)
- `npm run typecheck` - Run TypeScript checks (if available)

## Architecture Details

### Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Components**: shadcn/ui (Radix UI + Tailwind)
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth
- **Embeddings**: Google Gemini (768 dimensions)
- **State Management**: React Query

### Key Implementation Details

#### Document Processing
- **Chunking**: 1000 chars with 200 char overlap
- **Embeddings**: 768-dimensional vectors via Gemini
- **Storage**: Chunks stored in `coach_documents` with source reference
- **Deduplication**: SHA-256 hash of file content

#### API Structure
All routes require authentication:
- `/api/rag/*` - Document management
- `/api/youtube/*` - YouTube transcript processing
- `/api/users/*` - User management
- `/api/analytics/*` - Analytics tracking
- `/api/knowledge/*` - Knowledge base CRUD
- `/api/database/*` - Query console

### Database Schema (CoachMeld Tables)

**IMPORTANT**: The actual database schema is defined in the main CoachMeld application. 
This admin tool connects to CoachMeld's existing database.

**For the current schema, check:**
1. `/types/coachmeld.ts` - TypeScript interfaces that mirror the database
2. The main CoachMeld repository for CREATE TABLE statements
3. Supabase SQL Editor to inspect actual table structure

**Key tables we interact with:**
- `document_sources` - Stores document metadata and original content
- `coach_documents` - Stores document chunks with embeddings (vector(768))
- `coach_document_access` - Many-to-many document access control

**Key fields to remember:**
- `is_active` - Used for soft deletes (never hard delete)
- `file_hash` - SHA-256 hash for duplicate detection
- `source_id` - Links chunks to their source document
- `embedding` - 768-dimensional vector from Gemini

**Search function created by this admin tool:**
- `search_coach_documents(query_embedding, match_threshold, match_count)`

### IMPORTANT: Diet Type Handling
**As of January 2025, diet_type is INFORMATIONAL ONLY:**
- The `diet_type` column remains in the `profiles` table
- It is used ONLY for user preference tracking (what diet the user follows)
- It is NOT used for any business logic, coach selection, or document access
- Document access is managed exclusively through the `coach_document_access` table
- All new documents default to all coaches at Pro tier
- User's diet preference can be displayed in user management but does not affect functionality

## Testing Checklist
Before marking any PR as ready:
- [ ] Run `npm run dev` and check for console errors
- [ ] Test all modified endpoints with authentication
- [ ] Verify UI responsiveness on mobile viewport
- [ ] Check error states and loading states
- [ ] Test with empty/invalid data
- [ ] Verify migrations run successfully
- [ ] Ensure no TypeScript errors

## Common Issues & Solutions

1. **"relation does not exist"**: 
   - FIRST: Run `npm run sync-types` to check for schema changes
   - If types updated, the schema changed in CoachMeld
   - User may need to run new migrations
   - Update your code to match new schema

2. **"column does not exist"**:
   - IMMEDIATELY run `npm run sync-types`
   - This means CoachMeld's schema has changed
   - Review the updated types and adjust code accordingly

3. **TypeScript errors after pulling CoachMeld**:
   - Run `npm run sync-types`
   - The database schema likely changed

4. **Duplicate documents**: Check file_hash for deduplication

5. **Search returns nothing**: Verify embeddings were generated

6. **Auth errors**: Check Supabase environment variables

## Important File Locations
- Types: `/types/coachmeld.ts`
- API Routes: `/app/api/`
- UI Pages: `/app/dashboard/`
- Components: `/components/`
- Migrations: `/supabase/migrations/`
- Environment: `.env.local`

## Code Style Guidelines
- Use TypeScript strictly (no `any` unless necessary)
- Follow Next.js App Router conventions
- Keep components small and focused
- Use server components where possible
- Handle errors gracefully with try/catch
- Always validate user input
- Use proper TypeScript types

## Security Considerations
- Service role key only in server-side code
- Always authenticate API routes
- Validate and sanitize inputs
- Use parameterized queries
- Never expose sensitive data in client code
- Check user permissions before operations

## Future Integration Points
- Real-time updates with Supabase subscriptions
- Comprehensive audit logging
- Role-based access control (RBAC)
- Data export/import functionality
- Automated backup system

## Agent OS Documentation

### Product Context
- **Mission & Vision:** @.agent-os/product/mission.md
- **Technical Architecture:** @.agent-os/product/tech-stack.md
- **Development Roadmap:** @.agent-os/product/roadmap.md
- **Decision History:** @.agent-os/product/decisions.md

### Development Standards
- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

### Project Management
- **Active Specs:** @.agent-os/specs/
- **Spec Planning:** Use `@~/.agent-os/instructions/create-spec.md`
- **Tasks Execution:** Use `@~/.agent-os/instructions/execute-tasks.md`

## Workflow Instructions

When asked to work on this codebase:

1. **First**, check @.agent-os/product/roadmap.md for current priorities
2. **Then**, follow the appropriate instruction file:
   - For new features: @~/.agent-os/instructions/create-spec.md
   - For tasks execution: @~/.agent-os/instructions/execute-tasks.md
3. **Always**, adhere to the standards in the files listed above

## Important Notes

- Product-specific files in `.agent-os/product/` override any global standards
- User's specific instructions override (or amend) instructions found in `.agent-os/specs/...`
- Always adhere to established patterns, code style, and best practices documented above.

## REMEMBER
1. **Always read this file first** when starting work
2. **CHECK CURRENT BRANCH** - run `git branch` before ANY changes
3. **NEVER COMMIT TO MASTER** - create feature branch if on master
4. **CHECK FOR COACHMELD MIGRATIONS** at start of every session
5. **One PR at a time** - wait for merge before starting next
6. **Notify about migrations** immediately when created
7. **Follow PR template** exactly as specified
8. **Test everything** before marking PR ready
9. **Update master** after PR is merged
10. **Sync types** if CoachMeld schema changed