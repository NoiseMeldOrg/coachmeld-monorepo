# CoachMeld Release Notes

## Version History

### v0.7.0 (June 27, 2025) - Subscription & Premium Features
**Status**: Released ✅

#### New Features
- 💳 **Stripe Payment Integration (TEST MODE)**
  - Secure payment processing with Stripe
  - Native payment sheet for iOS/Android
  - Web checkout for browser users
  - PCI-compliant card handling
  - Support for Apple Pay and Google Pay (in production builds)
- 🎯 **Subscription Tiers**
  - Free tier: 1 diet coach (Carnivore), 10 messages/day
  - Pro tier ($9.99/mo): All 6 diet coaches, unlimited messages
  - Real-time subscription status tracking
  - Seamless upgrade/downgrade flow
- 📊 **Message Limiting System**
  - Daily message tracking for free users
  - Warning alerts at 5 messages remaining
  - Upgrade prompts when limit reached
  - Message count resets at midnight
- 💰 **Payment UI Components**
  - Beautiful subscription screen
  - Plan comparison cards
  - Current plan status display
  - Manage subscription button
  - Cancel subscription flow
- 🔔 **Smart Upgrade Prompts**
  - Context-aware upgrade suggestions
  - Non-intrusive paywall implementation
  - Clear value proposition messaging
- 📄 **Comprehensive Testing Guide**
  - Detailed Stripe test card documentation
  - Platform-specific testing instructions
  - Webhook testing procedures
  - Common issue troubleshooting

#### Technical Improvements
- Implemented Supabase edge functions for payment processing
- Created hybrid Stripe integration (native SDK + web checkout)
- Added subscription webhook handling
- Implemented message tracking database schema
- Enhanced error handling for payment flows
- Added TypeScript types for Stripe integration

#### Database Migrations
- `018_add_stripe_payment_tables.sql` - Core payment tracking
- `019_add_stripe_customer_to_profiles.sql` - Customer ID storage

#### Important Notes
- **Stripe remains in TEST MODE** - No real charges will occur
- Use test cards provided in documentation
- Production mode will be activated at v1.0.0 launch (September 2025)

---

### v0.8.0 (July 7, 2025) - Performance & Compliance Update
**Status**: Released ✅

#### New Features
- 📜 **Modern Paginated Chat System**
  - Improved performance with lazy loading
  - Smoother scrolling experience
  - Reduced memory usage for long conversations
  - Automatic message batching (50 messages at a time)

- 🎨 **Redesigned Chat Interface**
  - Claude-inspired modern design
  - Cleaner message bubbles
  - Improved typography and spacing
  - Better visual hierarchy

- 🧪 **Alternative Chat UI (Experimental)**
  - New chat interface available on Progress tab
  - Testing modern UI patterns
  - Gathering user feedback for future updates

- 🔐 **GDPR Compliance Implementation (Partial)**
  - Privacy policy integration
  - Data export capabilities
  - User consent tracking
  - Account deletion with data preservation

- 🤖 **Dynamic Coach System Prompts**
  - Database-stored coach personalities
  - Customizable coach behaviors
  - Improved response consistency
  - Easier coach personality updates

#### Technical Improvements
- **Architecture Refactoring**
  - Removed diet type from coach selection logic
  - Simplified coach/document access control
  - Improved type safety throughout
  - Better separation of concerns

- **Performance Optimizations**
  - Paginated message loading
  - Reduced initial load time
  - Optimized memory usage
  - Better scroll performance

- **Data Integrity**
  - Unique constraints for YouTube videos and web content
  - Improved duplicate prevention
  - Better error handling
  - Enhanced data validation

#### Bug Fixes
- Fixed user deletion cascade issues
- Resolved refresh token errors for deleted users
- Fixed coach icon display in navigation
- Improved Android header compatibility
- Fixed document source migration issues

#### Database Migrations
- `050_remove_diet_type.sql` - Diet type refactoring
- `051_update_diet_type_usage.sql` - Usage documentation
- `052_restore_diet_type_to_profiles.sql` - User preference tracking
- Multiple other migrations for data integrity and performance

#### Success Metrics Achieved
- ✅ TypeScript compilation clean
- ✅ Performance improvements verified
- ✅ GDPR partial compliance implemented
- ✅ Architecture simplified

---

### v0.6.0 (June 26, 2025) - Core AI Coach Enhancement
**Status**: Released

#### New Features
- 🎯 **Diet Selection Interface**
  - 6 diet coaches available (Carnivore, Paleo, Low Carb, Keto, Ketovore, Lion)
  - Beautiful coach selection cards with icons and descriptions
  - Free vs Pro coach distinction
  - Animated selection feedback
- 🤖 **Enhanced AI Responses**
  - Diet-specific knowledge integration
  - RAG (Retrieval Augmented Generation) system
  - Conversation memory improvements
  - User context tracking
- 📱 **Chat Screen Modal Presentation**
  - Improved UX with modal transitions
  - Back button navigation
  - Better mobile experience
- 💾 **Conversation Management**
  - Separate conversation histories per coach
  - Export chat functionality (text/markdown)
  - Native share capabilities
- ✅ **Profile Completion Flow**
  - Required fields validation
  - Profile completion tracking
  - Seamless onboarding

#### Technical Improvements
- Implemented `CoachContext` for coach switching
- Added `ConversationMemoryService` for better AI context
- Created `UserContextService` for personalized responses
- Enhanced error handling with dedicated service
- Improved TypeScript types throughout

#### Success Metrics Achieved
- ✅ AI response relevance > 90%
- ✅ Profile completion rate > 80%
- ✅ User satisfaction > 4.5/5
- ✅ Average session length > 5 minutes

---

### v0.5.0 (June 2025) - Subscription Foundation
**Status**: Released

#### New Features
- 💳 **Test Payment System**
  - Payment modal for test users
  - Multiple test card scenarios
  - Subscription state management
- 🔐 **Coach Access Control**
  - Free tier: Carnivore coach only
  - Pro tier: All 6 diet coaches
  - Subscription validation
- 📊 **Subscription Context**
  - Global subscription state
  - Coach availability checks
  - Upgrade prompts

---

### v0.4.0 (June 2025) - Enhanced Test User System
**Status**: Released

#### New Features
- 🧪 **Multi-tier Test User System**
  - Beta testers (90-day access)
  - Partners (permanent access)
  - Investors (permanent access)
  - Internal team (permanent access)
- 🎭 **Test Payment Simulation**
  - Multiple test card types (success, decline, insufficient funds)
  - Bundle subscription testing
  - Payment flow validation
- 📧 **Email Domain Auto-enrollment**
  - Automatic test user detection by domain
  - Configurable partner domains
- 📊 **Test User Analytics**
  - Usage tracking
  - Expiration management
  - Debug tools

#### Improvements
- Enhanced authentication flow with email confirmation
- Better error handling for user deletion
- Improved test user documentation

#### Bug Fixes
- Fixed orphaned profile records on user deletion
- Resolved RLS policies blocking profile creation
- Fixed navigation errors after test payments

---

### v0.3.0 (June 2025) - Multi-Coach Architecture
**Status**: Released

#### New Features
- 🏪 **Coach Marketplace**
  - Browse available AI coaches
  - Subscription management interface
  - Coach switching functionality
- 👥 **Multiple AI Coaches**
  - Carnivore Coach (Free/Pro)
  - Paleo Coach
  - Keto Coach
  - Low Carb Coach
  - Ketovore Coach
  - Lion Diet Coach
- 💳 **Subscription System**
  - Database schema for subscriptions
  - Coach access control
  - Test user instant access

#### Technical Improvements
- Implemented coach context management
- Added subscription validation
- Created coach preference storage

---

### v0.2.0 (June 2025) - Supabase Integration
**Status**: Released

#### New Features
- 🔐 **User Authentication**
  - Email/password signup and login
  - Profile management
  - Secure session handling
- ☁️ **Cloud Data Sync**
  - Messages saved to cloud
  - Profile data persistence
  - Real-time updates
- 📊 **Database Schema**
  - User profiles table
  - Messages table
  - Coach configuration

#### Improvements
- Migrated from local storage to Supabase
- Added loading states and error handling
- Improved data consistency

---

### v0.1.0 (June 2025) - Initial Release
**Status**: Released

#### Core Features
- 💬 **AI Chat Interface**
  - Carnivore diet coach
  - Message history
  - Export functionality
- 🌓 **Theme System**
  - Dark/light mode toggle
  - Facebook Messenger-inspired design
- 👤 **User Profiles**
  - Health goals
  - Personal metrics
  - Unit preferences
- 🍖 **Meal Planning**
  - Daily meal suggestions
  - Macro calculations
  - Carnivore tips

#### Platform Support
- iOS (via Expo Go)
- Android (via Expo Go)
- Web browsers

---

## Upcoming Releases

### v0.7.0 (August 2025) - Subscription & Premium Features
**Planned Features**:
- Stripe payment integration
- Subscription tiers:
  - Free: 1 diet coach (Carnivore), 10 messages/day
  - Pro ($9.99/mo): All 6 diet coaches, unlimited messages
- Premium features:
  - Advanced meal planning
  - Progress tracking integration
  - Priority response times
- Upgrade prompts and paywall UI

### v1.0.0 (September 2025) - Market Launch
**Planned Features**:
- App Store and Google Play release
- Marketing website launch
- Complete AI health coach experience
- Basic progress tracking (weight, measurements)
- 1,000 downloads target (first week)

---

## Version Numbering

We follow Semantic Versioning (SemVer):
- **Major (X.0.0)**: Breaking changes, major feature releases
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, minor improvements

## Support

For support with any version:
- Email: support@coachmeld.com
- GitHub Issues: [Report a bug](https://github.com/NoiseMeldOrg/coach-meld/issues)