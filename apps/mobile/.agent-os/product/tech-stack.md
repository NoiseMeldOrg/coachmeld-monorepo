# Technical Stack

> Last Updated: 2025-07-21
> Version: 1.0.0

## Core Technologies

### Application Framework
- **Framework:** React Native
- **Version:** 0.79.4
- **Language:** TypeScript 5.8

### Database
- **Primary:** PostgreSQL (via Supabase)
- **Version:** 15+
- **ORM:** Supabase Client

## Frontend Stack

### JavaScript Framework
- **Framework:** React Native with Expo
- **Version:** Expo SDK 53
- **Build Tool:** Metro bundler

### Import Strategy
- **Strategy:** Node.js modules
- **Package Manager:** npm
- **Node Version:** 18+

### CSS Framework
- **Framework:** React Native StyleSheet
- **Version:** Built-in
- **PostCSS:** N/A (React Native)

### UI Components
- **Library:** Custom components + React Native Elements
- **Version:** Custom
- **Installation:** Built into codebase

## Assets & Media

### Fonts
- **Provider:** System fonts
- **Loading Strategy:** Native font loading

### Icons
- **Library:** Ionicons, MaterialCommunityIcons
- **Implementation:** React Native Vector Icons

## Infrastructure

### Application Hosting
- **Platform:** Expo + EAS Build
- **Service:** Mobile app stores (iOS App Store, Google Play)
- **Region:** Global distribution

### Database Hosting
- **Provider:** Supabase
- **Service:** Managed PostgreSQL
- **Backups:** Automated daily

### Asset Storage
- **Provider:** Supabase Storage
- **CDN:** Supabase CDN
- **Access:** Row Level Security

## Backend Services

### Authentication
- **Provider:** Supabase Auth
- **Methods:** Email/password, OAuth providers
- **Session Management:** JWT tokens

### AI/ML Services
- **LLM Provider:** Google AI Studio (Gemini)
- **Embeddings:** Gemini text-embedding-004
- **Vector Database:** pgvector extension
- **RAG System:** Custom implementation

### Payment Processing
- **Provider:** Stripe
- **SDK:** @stripe/stripe-react-native
- **Mode:** Test mode (production at v1.0.0)
- **Integration:** Hybrid (native SDK + web checkout)

### Real-time Features
- **Provider:** Supabase Realtime
- **Protocol:** WebSocket
- **Use Cases:** Chat synchronization

## Development Tools

### State Management
- **Solution:** React Context API
- **Contexts:** Theme, User, Coach, Subscription, Auth
- **Persistence:** AsyncStorage

### Navigation
- **Library:** React Navigation 7
- **Navigators:** Stack + Bottom Tabs
- **Deep Linking:** Prepared for future

### Testing
- **Framework:** None currently (planned for v1.0.0)
- **Type Checking:** TypeScript strict mode
- **Linting:** ESLint (to be configured)

## Third-party Services

### Analytics
- **Provider:** PostHog (planned)
- **Implementation:** Event tracking
- **Privacy:** GDPR compliant

### Error Tracking
- **Provider:** None currently (planned: Sentry)
- **Implementation:** Future addition

### Push Notifications
- **Provider:** Expo Push Notifications (planned)
- **Implementation:** v1.1.0 milestone

## Deployment

### CI/CD Pipeline
- **Platform:** GitHub Actions (planned)
- **Trigger:** Push to master
- **Tests:** TypeScript compilation

### Environments
- **Production:** master branch
- **Staging:** Not configured
- **Review Apps:** Feature branches

### Mobile Deployment
- **iOS:** EAS Build → TestFlight → App Store
- **Android:** EAS Build → Internal Testing → Play Store
- **OTA Updates:** Expo Updates

## Security

### Data Protection
- **Encryption:** TLS in transit, encrypted at rest
- **Authentication:** Supabase RLS policies
- **API Security:** Row Level Security
- **Compliance:** GDPR (partial, full by v1.0.0)

## Code Repository
- **URL:** https://github.com/NoiseMeldOrg/coach-meld
- **VCS:** Git
- **Branch Strategy:** Feature branches → master