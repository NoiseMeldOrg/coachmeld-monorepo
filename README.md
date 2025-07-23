# CoachMeld Monorepo

A unified repository containing all CoachMeld applications and shared packages.

## 🏗️ Architecture

```
coachmeld-monorepo/
├── apps/
│   ├── mobile/          # React Native + Expo (iOS, Android, Web)
│   └── admin/           # Next.js admin dashboard
├── packages/
│   ├── shared-types/    # Database types and interfaces
│   ├── shared-config/   # Coach configs and constants
│   └── shared-utils/    # Common utility functions
└── docs/               # Monorepo documentation (future)
```

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) >= 1.0.0
- Node.js >= 18.0.0
- Expo CLI for mobile development

### Installation
```bash
# Install all dependencies across the monorepo
bun install
```

### Development Commands

#### Mobile App (React Native + Expo)
```bash
# Start Expo development server
bun mobile

# Start web-only development
bun web

# Start iOS simulator
bun ios

# Start Android emulator
bun android
```

#### Web Applications
```bash
# Start admin dashboard (Next.js)
bun admin
```

#### Build Commands
```bash
# Build admin dashboard for production
bun run build:admin

# Build mobile app for web deployment
bun run build:web

# Build mobile app for app stores
bun run build:mobile
```

## 📱 Applications

### Mobile App (`apps/mobile/`)
- **Framework**: React Native with Expo SDK 53
- **Platforms**: iOS, Android, Web
- **Features**: AI health coaching, multi-coach system, subscription management
- **Development**: Use `bun mobile` to start Expo dev server

### Admin Dashboard (`apps/admin/`)
- **Framework**: Next.js 14 with App Router
- **Purpose**: RAG document management, user administration, analytics
- **Features**: GDPR compliance tools, YouTube transcript processing
- **Development**: Use `bun admin` to start Next.js dev server


## 📦 Shared Packages

### shared-types (`packages/shared-types/`)
Common TypeScript interfaces and types used across all applications:
- Database schema types
- API response interfaces
- Coach configuration types

### shared-config (`packages/shared-config/`)
Shared configuration and constants:
- Coach definitions and themes
- App-wide constants
- Feature flags

### shared-utils (`packages/shared-utils/`)
Common utility functions:
- Date formatting
- Validation helpers
- Common calculations

## 🔧 Development Workflow

### Adding Dependencies
```bash
# Add dependency to specific app
cd apps/mobile && bun add package-name

# Add dependency to shared package
cd packages/shared-types && bun add package-name

# Add dev dependency to root
bun add -D package-name
```

### Using Shared Packages
```typescript
// In any app, import from shared packages
import { Coach, Profile } from '@coachmeld/shared-types'
import { COACH_CONFIGS } from '@coachmeld/shared-config'
import { formatDate } from '@coachmeld/shared-utils'
```

### Type Checking
```bash
# Check types across all apps
bun run type-check

# Check specific app
bun run type-check:mobile
bun run type-check:admin
bun run type-check:landing
```

## 🚀 Deployment

### Render.com Configurations

#### Admin Dashboard
- **Repository**: `coachmeld-monorepo`
- **Root Directory**: `apps/admin/`
- **Build Command**: `bun install && bun run build`
- **Start Command**: `bun start`

#### Mobile Web App (Expo Web)
- **Repository**: `coachmeld-monorepo`
- **Root Directory**: `apps/mobile/`
- **Build Command**: `bun install && bun expo export -p web`
- **Start Command**: `bun serve dist`

### Mobile App Stores
- **iOS**: EAS Build → TestFlight → App Store
- **Android**: EAS Build → Internal Testing → Play Store
- **Commands**: Use `bun run build:mobile` for app store builds

## 🗃️ Database Integration

All applications share a single Supabase database instance:
- **Mobile App**: Primary consumer of database
- **Admin App**: Management interface for database
- **Landing Page**: Read-only access for dynamic content

### Schema Management
- All database migrations are managed in the mobile app (`apps/mobile/supabase/migrations/`)
- Admin app syncs types automatically from mobile app schema
- Schema changes must be coordinated across all applications

## 🧪 Testing

```bash
# Run tests for all apps (when implemented)
bun test

# Run tests for specific app
cd apps/mobile && bun test
cd apps/admin && bun test
```

## 📚 Documentation

- **Mobile App**: See `apps/mobile/README.md`
- **Admin Dashboard**: See `apps/admin/README.md`
- **Landing Page**: See `apps/landing/README.md`
- **API Documentation**: See `docs/api/`

## 🤝 Contributing

1. **Branching**: Create feature branches for each change
2. **Commits**: Use conventional commit messages
3. **Testing**: Ensure all apps build successfully
4. **PRs**: Test across all affected applications

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [CoachMeld Mobile App](https://github.com/NoiseMeldOrg/coach-meld)
- [Admin Dashboard](https://github.com/NoiseMeldOrg/coach-meld-admin)
- [Landing Page](https://github.com/NoiseMeldOrg/coach-meld-landing-page)
- [Supabase Dashboard](https://app.supabase.com)