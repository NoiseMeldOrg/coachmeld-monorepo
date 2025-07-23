# CoachMeld Quick Reference Guide

**For developers working on the CoachMeld project**

## 🚀 Common Commands

### Development
```bash
# Start development server
cd coach-meld && npm start

# Run on specific platform
npm run ios          # iOS Simulator
npm run android      # Android Emulator
npm run web         # Web Browser

# For Android testing with Expo Go (use separate terminal!)
npx expo start --tunnel -c

# Clear cache and restart
npx expo start -c
```

### Building
```bash
# EAS Build (Android)
npx eas build --platform android --profile preview --clear-cache

# EAS Build (iOS)
npx eas build --platform ios --profile preview --clear-cache

# Local Android build
npx expo run:android

# Local iOS build
npx expo run:ios
```

### Database & Supabase
```bash
# Apply migrations
npx supabase db push

# Check migration status
npx supabase migration list

# Generate types from database
npx supabase gen types typescript --project-id ndthcblvtvquiaaekwpe > src/types/supabase.ts

# Reset local database
npx supabase db reset
```

### Testing & Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Run tests (when implemented)
npm test
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feat/feature-name

# Commit with conventional format
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "chore: update dependencies"

# Push and create PR
git push -u origin feat/feature-name
gh pr create

# After PR merged, clean up
git checkout master
git pull origin master
git branch -d feat/feature-name
```

## 📁 Project Structure

```
CoachMeld/
├── App.tsx                      # Root component
├── src/
│   ├── components/             # UI components
│   ├── context/               # Global state (Theme, User, Auth, Coach)
│   ├── screens/              # App screens
│   ├── services/            # API services
│   ├── utils/              # Utilities
│   └── types/             # TypeScript types
├── migrations/           # Database migrations
└── docs/               # Documentation
    ├── product/       # Business docs
    └── development/  # Technical docs
```

## 🔑 Important IDs & URLs

### Project Identifiers
- **Supabase Project ID**: `ndthcblvtvquiaaekwpe`
- **EAS Project ID**: `f53c4d35-ca8f-4b9b-8e0b-f53bb0028a83`
- **Bundle ID**: `com.noisemeld.coachmeld`

### Dashboard Links
- **Supabase**: https://supabase.com/dashboard/project/ndthcblvtvquiaaekwpe
- **Expo**: https://expo.dev/accounts/noisemeld/projects/CoachMeld
- **EAS Builds**: https://expo.dev/accounts/noisemeld/projects/CoachMeld/builds

### API Endpoints
- **Supabase URL**: `https://ndthcblvtvquiaaekwpe.supabase.co`
- **Database**: PostgreSQL with pgvector extension
- **Storage**: Supabase Storage for documents

## 🧪 Test Users

### Auto-Enrollment Domains
- `@noisemeld.com` - Internal team (all features)
- `@test.coachmeld.com` - Beta testers
- `@beta.coachmeld.com` - Beta program
- `@partner.domain.com` - Add partners in `src/config/testUsers.ts`

### Test Payment Cards
```javascript
// Success scenarios
'4242 4242 4242 4242' // Visa success
'5555 5555 5555 4444' // Mastercard success

// Failure scenarios  
'4000 0000 0000 0002' // Declined
'4000 0000 0000 9995' // Insufficient funds
```

## 🐛 Current Issues & Workarounds

### App Crash on Launch
**Status**: Debugging in progress  
**Workaround**: Use web version for development
```bash
npm run web
```

### Expo Go Testing
**Issue**: Terminal in Cursor doesn't show QR codes  
**Solution**: Run in separate terminal
```bash
# In Ubuntu/WSL terminal (NOT in Cursor)
npx expo start --tunnel -c
```

### Hot Reload Issues
**Issue**: Changes don't reflect in Expo Go  
**Solution**: Force restart
1. Close Expo Go app completely
2. Re-scan QR code
3. If still issues, use `-c` flag to clear cache

## 🏗️ Environment Setup

### Required Environment Variables
Create `.env` file in project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://ndthcblvtvquiaaekwpe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Required Tools
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Supabase CLI: `npm install -g supabase`

## 📚 Key Documentation

### Product & Business
- `/docs/product/PRODUCT_ROADMAP.md` - Vision and roadmap
- `/CLAUDE.md` - AI assistant instructions

### Technical
- `/docs/development/TECHNICAL_ROADMAP.md` - Tech implementation
- `/docs/development/CURRENT_SPRINT.md` - Active tasks
- `/docs/ARCHITECTURE.md` - System design
- `/docs/RAG_IMPLEMENTATION.md` - RAG system guide

### Testing & Operations
- `/docs/TEST_USER_GUIDE.md` - Test user setup
- `/docs/TESTING_SETUP.md` - Testing procedures
- `/docs/TROUBLESHOOTING.md` - Common issues

## ⚡ Performance Tips

1. **Use Production Builds for Testing**
   ```bash
   npx expo start --no-dev --minify
   ```

2. **Profile Performance**
   - React DevTools Profiler
   - Flipper for React Native

3. **Monitor Bundle Size**
   ```bash
   npx expo export:web
   # Check dist/ folder size
   ```

## 🔐 Security Reminders

1. **Never commit**:
   - `.env` files
   - API keys
   - Private keys
   - User data

2. **Always use**:
   - Environment variables for secrets
   - RLS (Row Level Security) in Supabase
   - HTTPS for all requests

3. **Test user data**:
   - Use fake data for test users
   - Clear test data regularly
   - Don't use production emails

## 📞 Getting Help

1. **Check documentation first**:
   - This guide
   - `/docs` folder
   - Supabase docs
   - Expo docs

2. **Common issues**:
   - See `/docs/TROUBLESHOOTING.md`
   - Check current sprint blockers
   - Review closed GitHub issues

3. **Team contacts**:
   - Technical: See CLAUDE.md
   - Product: See PRODUCT_ROADMAP.md

---

**Last Updated**: June 25, 2025  
**Quick Tip**: Use `Ctrl+K` in VS Code to search this file!