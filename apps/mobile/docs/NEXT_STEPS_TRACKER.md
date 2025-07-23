# Next Steps Tracker

## 🔴 Critical Path (Do in Order)

### 1. Fix Android App Crash
**Current Status**: Testing ThemeContext build
**Next Action**: Wait for build completion and test APK

```bash
# Check build status
npx eas build:list --platform android --limit 1

# Or visit
https://expo.dev/accounts/noisemeld/projects/CoachMeld/builds
```

**Decision Tree**:
- ✅ If ThemeContext APK works → Continue to Step 3 (BottomTabNavigator)
- ❌ If ThemeContext APK crashes → Test AsyncStorage separately
- 📝 Record results in this document

### 2. Set Up OpenAI API
**Why**: Required for generating embeddings from PDF text

**Steps**:
1. Go to https://platform.openai.com
2. Create account or login
3. Generate API key
4. Add to `.env` file:
   ```
   OPENAI_API_KEY=sk-...your-key-here...
   ```
5. Install OpenAI SDK:
   ```bash
   cd coach-meld && npm install openai
   ```

### 3. Upload First PDF
**Follow**: `/docs/PDF_UPLOAD_GUIDE.md`

**Quick Start**:
```sql
-- In Supabase SQL Editor
-- 1. Create source
INSERT INTO document_sources (coach_id, title, source_type, metadata)
VALUES ('carnivore', 'Your First PDF', 'pdf', '{"access_tier": "free"}'::jsonb)
RETURNING id;

-- 2. Add content (use returned ID)
INSERT INTO coach_documents (coach_id, source_id, title, content, chunk_index, total_chunks)
VALUES ('carnivore', 'ID-FROM-ABOVE', 'Introduction', 'Your PDF text...', 0, 1);
```

## 📊 Progress Dashboard

| Task | Status | Last Update | Next Action |
|------|--------|-------------|-------------|
| Debug App Crash | 🔄 Testing Step 2/6 | Building ThemeContext | Test APK when ready |
| RAG Documentation | ✅ Complete | All guides created | - |
| Database Setup | ✅ Complete | All tables ready | - |
| First PDF Upload | ⏳ Ready | Guide created | Upload when ready |
| OpenAI Integration | ❌ Not Started | Need API key | Get API key |
| Coach Roster | ✅ Complete | 20 coaches listed | - |

## 🎯 Today's Goals

1. [ ] Test ThemeContext APK
2. [ ] Get OpenAI API key
3. [ ] Upload first PDF to RAG system
4. [ ] Continue debugging based on APK test results

## 💡 Quick Wins (Can Do Anytime)

### Add Sample Data
```sql
-- Add a quick carnivore tip
INSERT INTO coach_documents (coach_id, title, content, chunk_index, total_chunks)
VALUES (
    'carnivore',
    'Quick Tip: Salt Importance',
    'When starting carnivore, ensure adequate salt intake. Many experience low energy due to electrolyte imbalance. Add 1-2 tsp of quality sea salt daily.',
    0,
    1
);
```

### Test Coach Queries
```sql
-- Find all carnivore content
SELECT title, substring(content, 1, 100) as preview
FROM coach_documents
WHERE coach_id = 'carnivore'
LIMIT 10;
```

## 📝 Debug Log

### Step 1: Navigation Only
- **Result**: ✅ SUCCESS - Navigation works!
- **Conclusion**: React Navigation is not the issue

### Step 2: ThemeContext
- **Added**: Context API, AsyncStorage, Dark mode toggle
- **Result**: ✅ SUCCESS - Theme toggle works and persists!
- **Conclusion**: Context API and AsyncStorage are working

### Step 3: BottomTabNavigator
- **Added**: Bottom tabs with 5 screens (Home, Progress, Coach, Meals, Settings)
- **Added**: Ionicons for tab icons
- **Result**: ✅ SUCCESS - All tabs work, icons display, theme styling works!
- **Conclusion**: Bottom navigation and Ionicons are working

### Step 4: UserContext
- **Added**: UserContext provider for profile management
- **Added**: Profile persistence with AsyncStorage
- **Result**: ✅ SUCCESS - Profile creation and updates work!
- **Conclusion**: All contexts and AsyncStorage working properly

### Step 5: Real Screens
- **Added**: Full UI components (Home, Coach, Meals, Progress, Settings)
- **Added**: Rich UI with stats, cards, meal plans
- **Result**: ✅ SUCCESS - All screens render properly!
- **Conclusion**: UI components work without Supabase

### Step 6: Supabase Integration (Final Test)
- **To Add**: Supabase client initialization
- **Test**: App with authentication
- **Status**: Ready to test - THIS IS LIKELY WHERE IT CRASHES

## 🔧 Useful Commands Reference

```bash
# Android Build & Test
npx eas build --platform android --profile preview
npx eas build:list --platform android --limit 1

# Local Development
npm run web
npm run android
npm run ios

# Database
npx supabase db push
npx supabase migration list

# Project Links
# Supabase: https://supabase.com/dashboard/project/ndthcblvtvquiaaekwpe
# Expo: https://expo.dev/accounts/noisemeld/projects/CoachMeld
```

## 📋 Document Locations

- **Architecture**: `/docs/ARCHITECTURE.md`
- **RAG Guide**: `/docs/RAG_IMPLEMENTATION.md`
- **PDF Upload**: `/docs/PDF_UPLOAD_GUIDE.md`
- **Coach List**: `/docs/COACH_ROSTER.md`
- **Roadmap**: `/docs/PROJECT_ROADMAP.md`

## 🚨 Blockers & Solutions

| Blocker | Impact | Solution | Status |
|---------|--------|----------|--------|
| App crashes on launch | Can't test on device | Progressive debugging | 🔄 In Progress |
| No OpenAI API key | Can't generate embeddings | User needs to create | ⏳ Waiting |
| No PDF upload UI | Manual SQL required | Created SQL guide | ✅ Workaround |

## 📅 This Week's Priorities

1. **Monday-Tuesday**: Fix app crash issue
2. **Wednesday**: Set up OpenAI embeddings
3. **Thursday**: Upload research PDFs
4. **Friday**: Test RAG integration

## 🎉 Recent Wins

- ✅ All database migrations applied successfully
- ✅ Comprehensive documentation created
- ✅ Navigation confirmed working
- ✅ Coach roster documented (20 coaches)
- ✅ Supabase CLI configured

---

**Last Updated**: 2025-06-20 (Auto-update this when making changes)