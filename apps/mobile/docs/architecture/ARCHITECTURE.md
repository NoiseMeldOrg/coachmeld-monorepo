# CoachMeld Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Application Structure](#application-structure)
5. [Component Hierarchy](#component-hierarchy)
6. [State Management](#state-management)
7. [Navigation Flow](#navigation-flow)
8. [Data Flow](#data-flow)
9. [API Integration](#api-integration)
10. [Security Architecture](#security-architecture)

## Overview

CoachMeld is a React Native mobile application built with Expo that provides personalized carnivore diet coaching through an AI-powered chat interface. The app follows a modular architecture with clear separation of concerns between UI components, business logic, and data management.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Mobile App)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   UI Layer  │  │ State Layer  │  │  Service Layer   │  │
│  │             │  │              │  │                  │  │
│  │ - Screens   │  │ - Contexts   │  │ - AI Coach API   │  │
│  │ - Components│  │ - Hooks      │  │ - Supabase       │  │
│  │ - Navigation│  │ - Local State│  │ - Local Storage  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS
                               │
┌─────────────────────────────────────────────────────────────┐
│                     Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Supabase   │  │   AI APIs    │  │  Cloud Storage   │  │
│  │             │  │              │  │                  │  │
│  │ - Auth      │  │ - Gemini 2.5 │  │ - User Data      │  │
│  │ - Database  │  │ - Coach Logic│  │ - Chat History   │  │
│  │ - Realtime  │  │              │  │ - Meal Plans     │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **React Native 0.79.4** - Cross-platform mobile framework
- **Expo SDK 53** - Development platform and build tools
- **TypeScript 5.8** - Type-safe JavaScript
- **React Navigation 7** - Navigation library with stack and tab navigators

### State Management
- **React Context API** - Global state management
- **Custom Hooks** - Reusable stateful logic
- **AsyncStorage** - Local data persistence

### Backend & Services
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Row-level security
- **AI Integration** - Currently mock, prepared for Gemini 2.5

### UI/UX
- **Custom Theme System** - Dark/Light mode support
- **Ionicons** - Icon library
- **Custom Components** - Reusable UI elements

## Application Structure

```
CoachMeld/
├── App.tsx                    # Root component with providers
├── index.ts                   # Expo entry point
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── BottomTabNavigator.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MessageBubble.tsx
│   │   └── coaches/
│   │       ├── CoachCard.tsx
│   │       └── CoachSelector.tsx
│   ├── context/             # Global state providers
│   │   ├── AuthContext.tsx
│   │   ├── CoachContext.tsx
│   │   ├── SubscriptionContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── UserContext.tsx
│   ├── screens/             # Application screens
│   │   ├── AuthScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── CoachMarketplaceScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── MealPlanScreen.tsx
│   │   ├── PlaceholderScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useSupabaseChat.ts
│   │   └── useSupabaseProfile.ts
│   ├── lib/                 # External library configs
│   │   └── supabase.ts
│   ├── services/            # Business logic
│   │   ├── aiCoachService.ts
│   │   └── coaches/
│   │       └── basicCoachService.ts
│   ├── theme/               # Theme configuration
│   │   └── colors.ts
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   └── utils/               # Utility functions
│       ├── aiCoach.ts
│       ├── testUserUtils.ts
│       └── validation.ts
├── assets/                  # Images and static files
├── docs/                    # Documentation
└── supabase/               # Backend configuration
    ├── migrations/
    ├── functions/
    └── schema.sql
```

## Component Hierarchy

```
App
├── ThemeProvider
│   └── AuthProvider
│       └── AppContent
│           ├── AuthScreen (if not authenticated)
│           └── NavigationContainer (if authenticated)
│               └── UserProvider
│                   └── CoachProvider
│                       └── SubscriptionProvider
│                           └── BottomTabNavigator
│                               ├── HomeScreen
│                               ├── PlaceholderScreen (Progress)
│                               ├── ChatScreen
│                               │   ├── MessageBubble
│                               │   └── ChatInput
│                               ├── MealPlanScreen
│                               └── ProfileScreen
```

## State Management

### Context Providers

1. **ThemeContext**
   - Manages dark/light theme preference
   - Persists theme choice to AsyncStorage
   - Provides theme object with colors

2. **AuthContext**
   - Handles user authentication state
   - Manages Supabase auth session
   - Provides login/logout/signup methods

3. **UserContext**
   - Stores user profile information
   - Manages user preferences (units, goals)
   - Syncs with Supabase profiles table

4. **CoachContext**
   - Manages selected coach and available coaches
   - Handles coach-specific configurations
   - Tracks coach interaction history

5. **SubscriptionContext**
   - Manages user subscription status
   - Handles tier-based feature access
   - Integrates with payment systems

### State Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Screens   │────▶│  Contexts   │────▶│  Services   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Components  │     │    Hooks    │     │  Supabase   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Navigation Flow

```
                    ┌──────────────┐
                    │   App Start  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Auth Check   │
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
         ┌──────▼──────┐      ┌──────▼──────┐
         │ Auth Screen │      │  Main App   │
         └──────┬──────┘      └──────┬──────┘
                │                     │
         ┌──────▼──────┐      ┌──────▼──────┐
         │   Sign Up   │      │ Tab Navigator│
         │   Sign In   │      └──────┬──────┘
         └─────────────┘              │
                           ┌──────────┼──────────┐
                           │          │          │
                    ┌──────▼───┐ ┌───▼────┐ ┌───▼────┐
                    │   Home   │ │Progress│ │  Coach │
                    └──────────┘ └────────┘ └────────┘
                           │          │          │
                    ┌──────▼───┐ ┌───▼────┐
                    │   Meals  │ │Settings│
                    └──────────┘ └────────┘
```

## Data Flow

### Chat Message Flow
```
User Input → ChatInput → ChatScreen → aiCoachService
                                            │
                                            ▼
                                      Process Message
                                            │
                                            ▼
                                    Generate Response
                                            │
                                            ▼
                              Update Local State & Storage
                                            │
                                            ▼
                                    Render MessageBubble
```

### User Profile Flow
```
ProfileScreen → Form Input → Validation → UserContext
                                              │
                                              ▼
                                     Update Local State
                                              │
                                              ▼
                                    Sync with Supabase
                                              │
                                              ▼
                                     Update UI State
```

## API Integration

### Supabase Integration
- **Authentication**: Email/password auth with session management
- **Database**: PostgreSQL with row-level security
- **Real-time**: Subscriptions for live updates
- **Storage**: User avatars and meal plan images

### AI Coach Integration (Future)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Chat Screen │────▶│ AI Service   │────▶│ Gemini API  │
└─────────────┘     └──────────────┘     └─────────────┘
       ▲                    │                     │
       │                    ▼                     │
       │            ┌──────────────┐              │
       └────────────│ Response     │◀─────────────┘
                    │ Processing   │
                    └──────────────┘
```

## Security Architecture

### Authentication Flow
1. User enters credentials
2. Supabase validates and returns session
3. Session stored in secure storage
4. Auth token included in API requests
5. Row-level security enforced in database

### Data Protection
- **Encryption**: HTTPS for all API calls
- **Token Management**: Secure storage of auth tokens
- **Input Validation**: Client and server-side validation
- **RLS Policies**: Database-level access control

### Security Best Practices
- No hardcoded secrets
- Environment variables for configuration
- Secure storage for sensitive data
- Regular security updates
- Input sanitization

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Screens loaded on-demand
2. **Memoization**: Expensive computations cached
3. **Virtual Lists**: Efficient rendering of long lists
4. **Image Optimization**: Compressed assets
5. **Code Splitting**: Reduced initial bundle size

### Caching Strategy
- **AsyncStorage**: User preferences and offline data
- **Memory Cache**: Frequently accessed data
- **API Cache**: Response caching with TTL
- **Image Cache**: Cached meal images and avatars

## Future Architecture Enhancements

1. **Microservices**: Separate coach services
2. **GraphQL**: More efficient data fetching
3. **WebSocket**: Real-time coach interactions
4. **ML Pipeline**: On-device AI processing
5. **Analytics**: User behavior tracking
6. **A/B Testing**: Feature experimentation