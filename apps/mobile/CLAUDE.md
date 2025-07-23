# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Always Review This Document
- After conversation summaries/compactions
- After the user clears the session
- Before making any code changes  
- When creating PRs or commits
- Before starting any new task

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

## Related Projects
- **coach-meld-admin**: Web admin app located at `../coach-meld-admin/`
- **Shared Database**: Both apps use the same Supabase project
- **Database Changes**: All migrations in this repo automatically affect the admin app
- **Coordination**: Consider admin app impact when making database schema changes

## Database Migrations

### IMPORTANT: When Creating Database Migrations
1. **Always notify the user**: When creating a new migration file, IMMEDIATELY tell the user:
   - "I've created a new database migration: `[filename]`"
   - "**ACTION REQUIRED**: Please run this migration in your Supabase dashboard"
   - "**ADMIN APP IMPACT**: This change will also affect the coach-meld-admin app"
   - Provide the exact path to the migration file
   - Explain what the migration does

2. **How to run migrations**:
   ```
   1. Go to Supabase Dashboard
   2. Navigate to SQL Editor
   3. Copy and paste the contents of the migration file
   4. Click "Run" to execute
   5. Verify the migration succeeded
   ```

3. **Migration naming convention**:
   - Check existing migrations first: `ls supabase/migrations/`
   - Use the next sequential number: `XXX_description.sql`
   - Example: `014_enhanced_test_users.sql`

4. **Always include in PR description**:
   - List any new migrations that need to be run
   - Include what database changes they make

## Git Workflow & PR Process

### Branch Strategy
- Create feature branches from `master` using descriptive names: `feat/feature-name`, `fix/bug-name`, etc.
- Always work on feature branches, never commit directly to master

### Creating Pull Requests
1. Create a new branch: `git checkout -b feat/feature-name`
2. Make changes and commit with descriptive messages
3. Push branch: `git push -u origin feat/feature-name`
4. Create PR using GitHub CLI: `gh pr create`
5. Use clear PR titles and detailed descriptions
6. Include test plan in PR body
7. After PR is merged, the feature branch will be deleted by the user

### Commit Messages
- Use conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`, etc.
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
- What was fixed/improved

## Key Changes

### Section Name (e.g., HomeScreen Improvements)
- ✨ Use emojis for visual organization
- 🎨 Describe UI/styling changes
- 🔗 Note navigation updates
- 📱 Mobile-specific improvements

### Another Section (e.g., Component Updates)
- 📏 Size/dimension changes
- 🏷️ Badge/label positioning
- 🎯 Functional improvements
- 🥩 Special icons or features

### Functionality Preserved
- ✅ List all features that remain intact
- ✅ Important integrations maintained
- ✅ Existing functionality preserved

## Screenshots (if applicable)
Describe visual changes or note where to see them

## Test plan
- [ ] Checklist item with specific test
- [ ] Another test to perform
- [ ] Verify specific functionality
- [ ] Platform-specific tests

🤖 Generated with [Claude Code](https://claude.ai/code)
```

### Solo Developer Workflow
Since this is a solo developer app, follow these specific practices:

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

### PR Creation with GitHub CLI
When creating PRs with `gh pr create`, use a HEREDOC for the body to ensure proper formatting:

```bash
gh pr create --title "Your PR title" --body "$(cat <<'EOF'
## Summary
- Your summary points here

## Key Changes
... rest of PR body ...

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

### Post-PR Workflow
**IMPORTANT**: When the user tells you they have merged/closed a PR:
1. IMMEDIATELY switch to master: `git checkout master`
2. ALWAYS pull the latest changes: `git pull origin master`
3. NEVER skip this step - working on outdated code causes issues
4. Only then continue with the next task

Example workflow:
```bash
# User says: "I merged PR #31 and closed it"
# You MUST do:
git checkout master
git pull origin master
# Now you have the latest code and can continue
```

## Project Overview

CoachMeld is a React Native AI health coach mobile app built with Expo and TypeScript. It features a messaging interface similar to Facebook Messenger with a specialized "Carnivore Coach" that provides personalized health advice based on user's health goals, personal information, and physical attributes.

## Development Commands

### Key Commands
- Install dependencies: `npm install`
- Run on Android: `npm run android`
- Start Expo: `npm start`
- TypeScript check: `npx tsc --noEmit`
- Seed coaches: `npm run seed:coaches`

## Testing Setup (Important)

- **For Android testing**: Use `npx expo start --tunnel -c` in a separate Ubuntu WSL terminal (outside Cursor)
- **ALWAYS use -c flag**: This clears the cache and ensures latest changes are loaded
- **Why**: Cursor's terminal doesn't display QR codes properly
- **Device**: Use Expo Go app on Android phone to scan QR code
- **Refresh Method**: Close Expo Go completely and re-open (hot reload unreliable)

### If Changes Don't Appear:
1. Stop Metro bundler (Ctrl+C)
2. Run: `npx expo start --tunnel -c --clear`
3. On Android: Force close Expo Go
4. Clear Expo Go cache: Settings > Apps > Expo Go > Storage > Clear Cache
5. Reopen Expo Go and scan QR code again

- **See**: `/docs/TESTING_SETUP.md` for detailed instructions

**IMPORTANT**: Do NOT run `npx expo start --tunnel -c` in the Claude Code WSL terminal session. The command output and QR code will not be visible. Always run this command in a separate terminal window for mobile testing with Expo Go.

## Architecture

### Tech Stack
- React Native with Expo
- TypeScript
- React Navigation (Stack and Bottom Tabs)
- Supabase (Authentication, Database, Storage, Realtime)
- AsyncStorage for local data persistence
- Context API for state management (Theme, User, Coach, Subscription contexts)
- Ionicons and MaterialCommunityIcons for iconography
- Expo Linear Gradient for visual effects
- React Native Safe Area Context for device-safe layouts
- React Native Reanimated for animations
- pgvector for RAG/knowledge base implementation

### Project Structure
- `src/components/` - Reusable UI components
- `src/context/` - Global state management (Theme, User, Coach, Subscription)
- `src/screens/` - Main app screens
- `src/utils/` - Utility functions and services
- `supabase/migrations/` - Database migrations
- `supabase/functions/` - Edge functions
- `docs/` - Project documentation

### Key Features
- Diet selection system with 6 specialized coaches (Carnivore, Paleo, Keto, Ketovore, Low Carb, Lion)
- Enhanced AI chat with RAG-powered responses and conversation memory
- Bottom navigation bar with 5 tabs (Home, Progress, Coach, Meals, Settings)
- Coach marketplace for browsing and subscribing to diet coaches
- Dark/Light theme toggle with Facebook Messenger-like colors
- User profile management with health goals and preferences
- Units selection (Imperial/Metric) with feet/inches support for height
- Chat interface with message persistence and export functionality
- Subscription system with tiered access (Limited Carnivore free, Pro coaches paid)
- Test payment simulation for development
- Home dashboard with quick stats and coach selection
- Meal planning screen with diet-specific suggestions
- Chat presented as modal with improved mobile UX
- Stripe payment integration (foundation in place)
- Medical disclaimer and legal compliance tracking

### Navigation Structure
The app uses a bottom tab navigator with the following screens:
1. **Home** - Dashboard with coach selection, quick stats, and quick actions
2. **Progress** - Placeholder for future progress tracking features (shows "Coming Soon")
3. **Coach** - Center tab with dynamic icon/color based on active coach, opens chat modal
4. **Meals** - Meal planning with diet-specific macros and tips
5. **Settings** - User profile, settings, and theme toggle

Additional screens:
- **Coach Marketplace** - Browse and subscribe to diet coaches
- **Diet Selection** - Choose your diet approach when switching coaches
- **Chat Screen** - AI coach chat interface (presented as modal)

### Important Implementation Details
- Profile screen uses `useNavigation` hook for navigation
- Height stored as total inches (imperial) or cm (metric) internally
- Theme preference persists using AsyncStorage
- Chat messages saved locally with timestamps
- User must complete profile before accessing full app features

### Current Integration Status
- ✅ Supabase fully integrated for auth, database, and storage
- ✅ RAG system implemented with pgvector for knowledge retrieval
- ✅ Enhanced AI responses with conversation memory
- ✅ Multi-coach system with 6 diet specialists
- ✅ Subscription management with test payments
- ✅ Stripe payment processing foundation
- ✅ Message limiting for free tier
- ✅ Premium feature gating
- ✅ Basic analytics and conversion tracking

## Key Project Documentation

### Product Documentation
- **[Product Requirements Document](docs/product/PRODUCT_REQUIREMENTS.md)** - Comprehensive PRD
- **[Product Roadmap](docs/product/PRODUCT_ROADMAP.md)** - Version timeline and features
- **[Release Notes](docs/product/RELEASE_NOTES.md)** - Version history and changelogs

### Technical Documentation
- **[Architecture Overview](docs/architecture/ARCHITECTURE.md)** - System design
- **[Multi-Coach Architecture](docs/MULTI_COACH_ARCHITECTURE.md)** - Coach system details
- **[RAG Implementation](docs/architecture/RAG_IMPLEMENTATION.md)** - Knowledge base design

### Legal & Compliance
- **[GDPR Compliance Requirements](docs/legal/GDPR_COMPLIANCE_REQUIREMENTS.md)** - Privacy implementation guide
- **[Stripe Testing Guide](docs/STRIPE_TESTING_GUIDE.md)** - Payment testing procedures
- **Medical Disclaimer** - Implemented in-app with legal compliance tracking

## Current Development Focus

### High Priority Features
1. **Progress Tracking** - Weight, measurements, photos with charts
2. **Advanced Meal Planning** - Shopping lists, meal prep guides, macros
3. **GDPR Compliance** - Privacy consent, data export, deletion rights
4. **Weekly Check-ins** - Goal setting and progress reviews

### Medium Priority Features  
1. **Push Notifications** - Daily tips, meal reminders
2. **Enhanced AI Responses** - Meal suggestions, recipe generation
3. **Privacy Settings Screen** - Granular consent management
4. **Beta Testing Program** - Early access for power users

### Low Priority Features
1. **Community Features** - User forums, success stories
2. **Advanced Analytics** - Detailed progress insights
3. **Coach Customization** - Personalized AI behaviors
4. **Integration APIs** - Third-party fitness app connections

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
