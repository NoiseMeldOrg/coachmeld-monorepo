# Product Roadmap

> Last Updated: 2025-07-21
> Version: 1.0.0
> Status: Development

## Phase 0: Already Completed ✅

The following features have been implemented as of v0.8.0:

### Core Infrastructure
- [x] React Native + Expo setup with TypeScript - Complete mobile app foundation `M`
- [x] Supabase integration (Auth, Database, Storage, Realtime) - Backend infrastructure `L`
- [x] Multi-platform support (iOS, Android, Web) - Cross-platform deployment `M`
- [x] Git repository with proper .gitignore - Version control setup `S`

### Authentication & User Management
- [x] Email/password authentication - User signup and login `M`
- [x] User profiles with health metrics - Height, weight, goals, preferences `L`
- [x] Test user system - Beta testers and partners support `M`
- [x] Profile completion requirements - Ensure data quality `S`

### Multi-Coach System
- [x] 6 specialized diet coaches - Carnivore, Paleo, Keto, Ketovore, Low Carb, Lion `XL`
- [x] Coach marketplace UI - Browse and select coaches `L`
- [x] Coach theme system - Unique colors and icons per coach `M`
- [x] Free tier support - Carnivore coach with 5 messages/day `M`

### AI Chat Features
- [x] Real-time chat interface - Facebook Messenger-inspired UI `L`
- [x] RAG system with pgvector - Knowledge base retrieval `XL`
- [x] Conversation memory - Context-aware responses `L`
- [x] Message persistence - Save and sync chat history `M`
- [x] Export functionality - Download chats as text/markdown `S`
- [x] Paginated chat loading - Performance optimization `M`

### Subscription & Payments
- [x] Stripe integration (test mode) - Payment processing foundation `XL`
- [x] Subscription tiers - Free (1 coach) vs Pro ($9.99/mo) `L`
- [x] Message limiting - 5/day free, unlimited pro `M`
- [x] Upgrade prompts - Context-aware paywall `M`
- [x] Subscription management UI - View and cancel subscriptions `M`

### Meal Planning
- [x] Dynamic meal generation - AI-powered meal suggestions `L`
- [x] Recipe management - Detailed recipes with macros `L`
- [x] Favorites system - Save preferred recipes `M`
- [x] Coach-specific meals - Diet-appropriate suggestions `M`

### UI/UX Features
- [x] Bottom navigation - Home, Progress, Coach, Meals, Settings `M`
- [x] Dark/Light theme toggle - User preference persistence `M`
- [x] Modal chat interface - Better mobile UX `S`
- [x] Loading states and error handling - Polished experience `M`

### Compliance & Legal
- [x] Medical disclaimer - Legal protection `S`
- [x] Privacy policy integration - GDPR groundwork `M`
- [x] Account deletion system - User data control `M`
- [x] Consent tracking - Legal compliance `S`

## Phase 1: Current Development (v0.9.0 - August 2025)

**Goal:** Achieve full GDPR legal compliance and add progress tracking features
**Success Criteria:** 100% GDPR compliance for EU users, users can track health metrics and see visual progress

### Must-Have Features (GDPR Legal Compliance)

- [ ] **Privacy Policy Integration** - Clear, accessible privacy policy in app with comprehensive data collection explanation `M`
- [ ] **User Data Request Flow** - In-app ability for users to request data export or deletion (integrates with admin app APIs) `M`
- [ ] **Consent Management System** - Proper consent collection for data processing, especially for EU users `L`
- [ ] **Data Subject Rights UI** - Easy access to GDPR rights (view data, correct data, delete account) in settings `M`
- [ ] **Privacy Settings Screen** - Granular privacy controls allowing users to control data collection/processing `L`
- [ ] **Data Portability Export** - Allow users to export their data in machine-readable format `M`
- [ ] **Signup Consent Flow** - Clear consent checkboxes during user registration with legal basis explanation `S`
- [ ] **Updated Terms of Service** - GDPR-compliant terms covering all data processing activities `S`
- [ ] **Cookie/Tracking Consent Banner** - For analytics/tracking, implement consent system for EU users `S`

### Must-Have Features (Core Product)

- [ ] Progress tracking system - Weight, measurements, photos with charts `L`
- [ ] Advanced meal planning - Shopping lists, meal prep guides, weekly plans `L`
- [ ] Weekly check-ins - Goal setting and progress reviews `M`
- [ ] Push notifications foundation - Daily tips, meal reminders `M`

### Should-Have Features

- [ ] Enhanced recipe search - Filter by ingredients, cook time `M`
- [ ] Meal plan templates - Pre-built weekly plans `M`
- [ ] Basic analytics - User engagement metrics `S`

### Dependencies

- **GDPR Compliance Dependencies:**
  - Admin app provides backend GDPR APIs ✅ (already implemented)
  - Legal review of privacy policy and terms required
  - EU user identification system for targeted consent flows
  - Testing with EU-based beta users for compliance verification
- **Technical Dependencies:**
  - Charting library selection
  - Push notification service setup

### GDPR Integration with Admin App

The mobile app will integrate with the admin app for complete GDPR compliance:

**Admin App Responsibilities** (Already Implemented):
- Backend GDPR deletion APIs with 30-day SLA
- Data processing records documentation
- Breach notification system (72-hour compliance)
- Audit trails and compliance monitoring

**Mobile App Responsibilities** (v0.9.0 Implementation):
- User-facing privacy controls and consent management
- In-app data request flows (export/deletion)
- Privacy policy presentation and consent collection
- Data subject rights interface

**Integration Points:**
- Mobile app calls admin app APIs for data operations
- Shared database ensures real-time synchronization
- Consistent privacy preferences across both applications

## Phase 2: Market Launch (v1.0.0 - September 2025)

**Goal:** Production-ready release for app stores
**Success Criteria:** App approved and live on iOS and Android stores

### Must-Have Features

- [ ] Production Stripe activation - Real payment processing `M`
- [ ] App store optimization - Screenshots, descriptions, keywords `M`
- [ ] Marketing website - Landing page with app links `L`
- [ ] Onboarding improvements - First-time user experience `M`
- [ ] Performance optimizations - App size, load times `M`

### Should-Have Features

- [ ] Referral system - User growth incentives `L`
- [ ] Email notifications - Engagement campaigns `M`
- [ ] A/B testing framework - Optimization infrastructure `M`
- [ ] Customer support system - Help desk integration `M`

### Dependencies

- Business entity formation
- Stripe production approval
- App store developer accounts
- Marketing materials

## Phase 3: Scale and Polish (v1.1.0 - Q4 2025)

**Goal:** Enhance user retention and add community features
**Success Criteria:** 20% improvement in user retention

### Must-Have Features

- [ ] Community features - User forums, success stories `XL`
- [ ] Advanced progress analytics - Detailed insights, trends `L`
- [ ] Coach customization - Personalized AI behaviors `L`
- [ ] Integration APIs - Connect fitness trackers `L`
- [ ] Offline mode improvements - Full offline functionality `M`

### Should-Have Features

- [ ] Challenges system - Group challenges, leaderboards `L`
- [ ] Content creator tools - User-generated recipes `M`
- [ ] Advanced filtering - Search across all content `M`

### Dependencies

- Community moderation strategy
- API documentation
- Scaling infrastructure

## Phase 4: Advanced Features (v1.2.0 - Q1 2026)

**Goal:** Expand beyond diet into holistic life coaching
**Success Criteria:** Launch 2 new coach categories

### Must-Have Features

- [ ] Fitness coaches - Workout plans, form checks `XL`
- [ ] Mindfulness coaches - Meditation, stress management `XL`
- [ ] Multi-coach conversations - Integrated advice `L`
- [ ] Advanced meal planning AI - Grocery optimization `L`
- [ ] Video content support - Exercise demonstrations `L`

### Should-Have Features

- [ ] Wearable integrations - Apple Health, Google Fit `L`
- [ ] Supplement tracking - Recommendations, reminders `M`
- [ ] Recipe scaling - Adjust for family size `S`

### Dependencies

- Additional coach content creation
- Video hosting solution
- Expanded AI training

## Phase 5: Next.js Web Application (Future - 1-2 weeks when prioritized)

**Goal:** Create professional web presence with coaching functionality
**Success Criteria:** Deployed Next.js web app with basic coaching and marketing features

### Must-Have Features

- [ ] **Professional Landing Page** - SEO-optimized marketing site with CoachMeld branding `M`
- [ ] **Web Authentication** - Login/signup flow integrated with existing Supabase auth `M`
- [ ] **Basic Coaching Chat** - Web-optimized chat interface with 1-2 coaches initially `L`
- [ ] **Stripe Checkout Integration** - Web subscription flow using existing edge functions `M`
- [ ] **Responsive Design** - Desktop and tablet optimized layouts `M`

### Should-Have Features

- [ ] **Marketing Pages** - About, pricing, contact, and FAQ pages `M`
- [ ] **Blog/Content System** - SEO content for health coaching topics `L`
- [ ] **User Dashboard** - Basic profile and subscription management `M`
- [ ] **Progressive Web App** - PWA features for mobile web users `S`

### Technical Implementation

**Shared Infrastructure:**
- Supabase database (already exists) ✅
- TypeScript types (already exists) ✅  
- Stripe web checkout (already implemented) ✅
- Authentication APIs (already exists) ✅

**New Components:**
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Deployment on Vercel or similar platform

### Dependencies

- Next.js web app decision approved (DEC-008) ✅
- Existing Supabase backend ✅
- Shared TypeScript types from mobile app ✅
- Design system and branding guidelines

## Phase 6: Enterprise Features (v2.0.0 - Q3 2026)

**Goal:** B2B offerings and platform expansion
**Success Criteria:** First enterprise customer onboarded

### Must-Have Features

- [ ] Corporate wellness programs - Employee health tracking `XL`
- [ ] White-label options - Custom branding `XL`
- [ ] Admin dashboards - Company-wide analytics `L`
- [ ] HIPAA compliance - Healthcare integration ready `XL`
- [ ] API platform - Third-party integrations `L`

### Should-Have Features

- [ ] Telehealth integration - Connect with professionals `XL`
- [ ] Insurance partnerships - Coverage options `XL`
- [ ] Multi-language support - Global accessibility `L`

### Dependencies

- Enterprise sales team
- Compliance certifications
- Scalable infrastructure

## Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Message volume per user
- Subscription conversion rate
- User retention (30/60/90 day)

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate

### Technical Metrics
- App crash rate < 1%
- API response time < 200ms
- Chat delivery success > 99.9%
- App store rating > 4.5 stars