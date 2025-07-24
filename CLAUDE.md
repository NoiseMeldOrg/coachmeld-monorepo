# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this CoachMeld monorepo.

## IMPORTANT: Always Review This Document
- After conversation summaries/compactions
- After the user clears the session
- Before making any code changes  
- When creating PRs or commits
- Before starting any new task

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

## Development Principles
- Make every change as simple as possible
- Avoid massive or complex changes
- Each change should impact minimal code
- Use TodoWrite/TodoRead tools to track complex tasks
- Provide high-level explanations of changes made

## Developer Information
- **Timezone**: EST (Eastern Standard Time)
- **Company**: NoiseMeld
- **Role**: App Developer/Owner

## Library Documentation & Context7

When working with external libraries or needing up-to-date documentation:

1. **Always use Context7 MCP server** for library documentation lookup
2. **Before implementing new features** with third-party libraries, check Context7 for latest docs
3. **Common libraries to check**: React Native components, Expo modules, Supabase features, Stripe SDK, Next.js patterns

### Context7 Usage Pattern:
- First resolve the library ID: "Help me find docs for [library-name]"
- Then get specific documentation: "Show me [specific-topic] documentation for [library]"

This ensures we're using the most current documentation and best practices.

## Monorepo Structure

### Applications
- **Mobile App**: `apps/mobile/` - React Native AI health coaching app (Primary Product)
- **Admin Dashboard**: `apps/admin/` - Next.js web admin interface for backend management

### Shared Infrastructure
- **Database**: Both apps use the same Supabase project with shared schema
- **Database Changes**: All migrations managed in `apps/mobile/supabase/migrations/`
- **Coordination**: Consider cross-app impact when making database schema changes

## Database Migrations

### IMPORTANT: When Creating Database Migrations
1. **Always notify the user**: When creating a new migration file, IMMEDIATELY tell the user:
   - "I've created a new database migration: `[filename]`"
   - "**ACTION REQUIRED**: Please run this migration in your Supabase dashboard"
   - "**CROSS-APP IMPACT**: This change will affect both mobile and admin apps"
   - Provide the exact path to the migration file
   - Explain what the migration does

2. **Migration location**: ALL migrations go in `apps/mobile/supabase/migrations/`
   - Both apps share the same database schema
   - Admin app has type sync script to update TypeScript types

3. **How to run migrations**:
   ```
   1. Go to Supabase Dashboard
   2. Navigate to SQL Editor
   3. Copy and paste the contents of the migration file
   4. Click "Run" to execute  
   5. Verify the migration succeeded
   6. Run `npm run sync-types` in admin app if needed
   ```

4. **Migration naming convention**:
   - Check existing migrations first: `ls apps/mobile/supabase/migrations/`
   - Use the next sequential number: `XXX_description.sql`
   - Example: `056_add_new_feature.sql`

## Git Workflow & PR Process

### Branch Strategy
- Create feature branches from `master` using descriptive names: `feat/feature-name`, `fix/bug-name`, etc.
- Always work on feature branches, never commit directly to master
- Use prefixes: `feat/mobile/`, `feat/admin/`, `feat/shared/` for clarity

### Creating Pull Requests
1. Create a new branch: `git checkout -b feat/app-name/feature-name`
2. Make changes and commit with descriptive messages
3. Push branch: `git push -u origin feat/app-name/feature-name`
4. Create PR using GitHub CLI: `gh pr create`
5. Use clear PR titles indicating which app(s) are affected
6. Include test plan in PR body
7. After PR is merged, the feature branch will be deleted by the user

### Commit Messages
- Use conventional commit format with app scope: `feat(mobile):`, `fix(admin):`, `feat(shared):`, etc.
- Include detailed bullet points describing changes
- Keep first line under 72 characters
- Add detailed description with bullets explaining:
  - What was changed
  - What was preserved/kept intact
  - Why the changes were made
- Always end with Claude Code attribution:
  ```
  🤖 Generated with [Claude Code](https://claude.ai/code)
  
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

### PR Body Structure
Use this structured format for PR descriptions:

```markdown
## Summary
- Brief overview with bullet points
- Key changes made
- Apps affected (Mobile/Admin/Both)

## Key Changes

### Mobile App Changes
- 📱 Mobile-specific improvements
- 🎨 UI/styling changes
- 🔗 Navigation updates

### Admin Dashboard Changes  
- 🖥️ Admin interface improvements
- 📊 Analytics/management features
- 🔧 Backend operations

### Shared/Database Changes
- 🗄️ Schema modifications
- 🔄 Migration details
- 🌐 Cross-app integrations

### Functionality Preserved
- ✅ List all features that remain intact
- ✅ Important integrations maintained
- ✅ Existing functionality preserved

## Screenshots (if applicable)
Describe visual changes or note where to see them

## Test plan
- [ ] Mobile app testing steps
- [ ] Admin dashboard testing steps  
- [ ] Cross-app integration tests
- [ ] Database migration verification

🤖 Generated with [Claude Code](https://claude.ai/code)
```

### Solo Developer Workflow
Since this is a solo developer project, follow these specific practices:

#### One PR at a Time
- **Only have ONE pull request open at any time**
- Complete and merge the current PR before starting new work
- This prevents conflicts and keeps the workflow simple

#### PR Testing Protocol
1. When creating a new PR, IMMEDIATELY notify the user: "PR #X is ready for testing"
2. Wait for user feedback before proceeding to other tasks
3. If changes are needed, update the same PR (don't create a new one)

#### Branch Management
- NEVER commit directly to master
- ALWAYS create a feature branch first
- When making fixes to an existing PR, push to the same branch
- Delete local branches after PRs are merged

### Post-PR Workflow
**IMPORTANT**: When the user tells you they have merged/closed a PR:
1. IMMEDIATELY switch to master: `git checkout master`
2. ALWAYS pull the latest changes: `git pull origin master`
3. NEVER skip this step - working on outdated code causes issues
4. Only then continue with the next task

## Mobile App Development (Primary Product)

### Overview
CoachMeld is a React Native AI health coach mobile app built with Expo and TypeScript. It features a messaging interface similar to Facebook Messenger with 6 specialized diet coaches that provide personalized health advice based on user's health goals and preferences.

### Current Focus
- **Version**: v0.8.0 approaching v0.9.0
- **Priority**: GDPR legal compliance for EU users (MVP blocking)
- **Launch Target**: v1.0.0 in September 2025

### Tech Stack
- React Native with Expo (SDK 53)
- TypeScript 5.8
- Supabase (Auth, Database, Storage, Realtime)
- Google AI Studio (Gemini) for LLM and embeddings
- Stripe for payments (test mode)
- React Navigation for routing

### Development Commands
- Install dependencies: `cd apps/mobile && npm install`
- Run on Android: `cd apps/mobile && npm run android`
- Run on iOS: `cd apps/mobile && npm run ios`
- Start Expo: `cd apps/mobile && npm start`
- TypeScript check: `cd apps/mobile && npx tsc --noEmit`

### Testing Setup (Important)
- **For Android testing**: Use `npx expo start --tunnel -c` in a separate terminal (outside Claude Code terminal)
- **ALWAYS use -c flag**: This clears the cache and ensures latest changes are loaded
- **Device**: Use Expo Go app on Android phone to scan QR code
- **Refresh Method**: Close Expo Go completely and re-open (hot reload unreliable)

**IMPORTANT**: Do NOT run `npx expo start --tunnel -c` in the Claude Code terminal session. The command output and QR code will not be visible. Always run this command in a separate terminal window for mobile testing with Expo Go.

### Architecture
- **Navigation**: Bottom tabs (Home, Progress, Coach, Meals, Settings)
- **State Management**: React Context API (Theme, User, Coach, Subscription, Auth)
- **Persistence**: AsyncStorage for local data
- **Chat Interface**: Facebook Messenger-inspired modal UI
- **AI System**: RAG-powered responses with conversation memory
- **Subscription Model**: Freemium (1 free coach, $9.99/mo for all coaches)

## Admin Dashboard Development (Supporting Tool)

### Overview
Next.js 14 web application providing comprehensive backend management for the CoachMeld platform, including GDPR compliance, RAG document management, user administration, and system analytics.

### Current Focus
- **Status**: Fully functional, supporting mobile app MVP
- **Priority**: GDPR legal compliance documentation and breach notification
- **Role**: Backend operations and compliance management

### Tech Stack
- Next.js 14 (App Router) with TypeScript
- Tailwind CSS + shadcn/ui components
- Supabase (shared database with mobile app)
- Google AI for embeddings and document processing

### Development Commands
- Install dependencies: `cd apps/admin && npm install`
- Run development server: `cd apps/admin && npm run dev`
- Build for production: `cd apps/admin && npm run build`
- TypeScript check: `cd apps/admin && npx tsc --noEmit`
- Sync types from mobile: `cd apps/admin && npm run sync-types`

### Key Features
- **RAG System Management**: Document upload, chunking, vector embeddings
- **GDPR Compliance**: Automated deletion workflows with SLA monitoring
- **User Management**: Comprehensive admin dashboard with search and analytics
- **YouTube Integration**: Batch transcript processing for knowledge base
- **Database Console**: Direct SQL query interface with migration management

## Agent OS Documentation

### Product Context - Mobile App (Primary)
- **Mission & Vision:** @apps/mobile/.agent-os/product/mission.md
- **Technical Architecture:** @apps/mobile/.agent-os/product/tech-stack.md
- **Development Roadmap:** @apps/mobile/.agent-os/product/roadmap.md
- **Decision History:** @apps/mobile/.agent-os/product/decisions.md

### Product Context - Admin Dashboard (Supporting)
- **Mission & Vision:** @apps/admin/.agent-os/product/mission.md
- **Technical Architecture:** @apps/admin/.agent-os/product/tech-stack.md
- **Development Roadmap:** @apps/admin/.agent-os/product/roadmap.md
- **Decision History:** @apps/admin/.agent-os/product/decisions.md

### Development Standards (Global)
- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md
- **Tech Stack Defaults:** @~/.agent-os/standards/tech-stack.md

### Project Management
- **Active Specs:** @.agent-os/specs/ (to be created at monorepo root)
- **Spec Planning:** Use `/create-spec` command
- **Tasks Execution:** Use `/execute-task` command

## Workflow Instructions

When asked to work on this codebase:

1. **First**, determine which app(s) are affected by the request
2. **Check** the relevant roadmap for current priorities:
   - Mobile: @apps/mobile/.agent-os/product/roadmap.md (Phase 1: GDPR compliance)
   - Admin: @apps/admin/.agent-os/product/roadmap.md (Phase 1: MVP support)
3. **Then**, follow the appropriate instruction file:
   - For new features: `/create-spec` command
   - For tasks execution: `/execute-task` command
4. **Always**, adhere to the standards and app-specific guidelines

## Important Notes

### Cross-App Coordination
- Database changes affect both apps - always consider impact
- Admin app provides backend APIs that mobile app may consume
- GDPR compliance requires coordination between both apps
- Shared Supabase project means real-time data synchronization

### App-Specific Guidelines
- **Mobile App**: Focus on user experience, performance, offline support
- **Admin Dashboard**: Focus on operational efficiency, data accuracy, compliance
- **Both**: Maintain consistent data models and API contracts

### Agent OS Integration
- Specs created at monorepo root level affect appropriate app(s)
- Product-specific files in `.agent-os/product/` override global standards
- User instructions override (or amend) instructions found in `.agent-os/specs/`
- Always adhere to established patterns, code style, and best practices

### Development Environment
- **Java**: OpenJDK 17 installed for Android development
- **Node**: Version 18+ required for both apps
- **Package Manager**: npm (consistent across monorepo)
- **IDE**: Optimized for VS Code with appropriate extensions

### Current Development Status
- **Mobile App**: v0.8.0, approaching v0.9.0 with GDPR focus
- **Admin Dashboard**: Fully functional, supporting mobile MVP
- **Next Milestone**: Mobile v1.0.0 launch (September 2025)
- **Priority**: GDPR legal compliance across both applications