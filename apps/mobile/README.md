# CoachMeld - AI Health Coach Mobile App

**⚠️ PROPRIETARY SOFTWARE - All Rights Reserved**

**Current Version:** 0.7.0  
**Status:** Active Development (Test Mode)  
**Latest Release:** June 27, 2025

A React Native mobile app that provides personalized carnivore diet coaching through an AI-powered chat interface.

## Features

### Released Features
#### v0.6.0 (June 26, 2025)
- 🎯 **Multiple Diet Coaches** - 6 specialized coaches (Carnivore, Paleo, Keto, Ketovore, Low Carb, Lion)
- 💬 **Enhanced AI Chat** - RAG-powered responses with conversation memory
- 🔄 **Coach Switching** - Seamlessly switch between different diet coaches
- 📤 **Chat Export** - Export conversations as text or markdown
- 🌓 **Dark/Light Theme** - Toggle between dark and light modes
- 👤 **User Profiles** - Store personal health information and goals
- 🍖 **Meal Planning** - Diet-specific meal plans and suggestions
- 📱 **Cross-Platform** - Works on iOS, Android, and Web

#### v0.7.0 (June 27, 2025) - Current Version
- 💳 **Subscription System** - Free tier (1 coach, 10 msgs/day) vs Pro tier (all coaches, unlimited)
- 💰 **Stripe Payments (TEST MODE)** - Subscription billing ready for testing
- 🔒 **Payment Security** - PCI-compliant payment processing
- 💳 **Multiple Payment Methods** - Cards, Apple Pay, Google Pay
- 📊 **Message Limits** - Free tier limited to 10 messages per day
- 🔔 **Upgrade Prompts** - Smart alerts when approaching limits

**Note:** Payments are in TEST MODE. Use test cards only. Production payments will be enabled in v1.0.0.

### Coming Soon (v0.8.0 - July 2025)
- 📊 **Progress Tracking** - Monitor your health journey with photos and measurements
- 🍽️ **Advanced Meal Planning** - Shopping lists and meal prep guides
- 🔔 **Push Notifications** - Daily tips and reminders
- 🔒 **GDPR Compliance** - Full privacy controls and data protection
- 📈 **Advanced Analytics** - Track your transformation

## Screenshots

<img src="screenshots/chat.png" width="250"> <img src="screenshots/profile.png" width="250"> <img src="screenshots/home.png" width="250">

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)
- Supabase account (free tier available at [supabase.com](https://supabase.com))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/NoiseMeld/coach-meld.git
cd coach-meld
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the schema from `supabase/schema.sql` in SQL Editor
   - Copy your project URL and anon key from Settings > API

4. Configure environment:
```bash
cp .env.example .env.local
# Edit .env.local with your:
# - Supabase credentials
# - Gemini API key
# - Stripe test keys (for payment testing)
```

### Testing Payments

For payment testing with Stripe, use these test cards:
- **Success**: `4242 4242 4242 4242`
- **Requires auth**: `4000 0025 0000 3155`  
- **Declined**: `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC. See [Stripe Testing Guide](docs/STRIPE_TESTING_GUIDE.md) for comprehensive testing scenarios.

5. Start the development server:
```bash
npm start
# or for web specifically:
npm run web
```

6. Run on your device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app for physical device

### Testing on Web with Mobile Emulation

When developing using the web version (`npm run web`), you can test mobile layouts and interactions using Chrome's built-in device emulation:

1. Open the app in Chrome at `http://localhost:8081`
2. Press `F12` to open Developer Tools
3. Click the device toggle icon (📱) in the DevTools toolbar
4. Select a mobile device from the dropdown (e.g., iPhone 12, Pixel 5)
5. The browser will simulate the selected device's screen size and touch interactions

This is particularly useful when Expo Go connection issues prevent testing on a physical device.

### Building for Android with EAS Build

If you're unable to use Expo Go or don't have Android SDK installed locally, you can build an APK using Expo's cloud build service (EAS Build):

1. Create an Expo account at [expo.dev](https://expo.dev)

2. Login to EAS:
```bash
npx eas login
```

3. Configure your project for EAS (first time only):
```bash
npx eas build:configure
```

4. Build an APK for testing:
```bash
npx eas build --platform android --profile preview
```

5. The build will:
   - Upload your code to Expo's servers
   - Build the APK in the cloud (takes 10-20 minutes)
   - Provide a download link when complete

6. Install the APK on your Android device:
   - Download the APK from the provided URL
   - Enable "Install from unknown sources" in Android settings
   - Install and run the app

**Note**: The `npm run android` command requires Android SDK installed locally and will fail in WSL or without proper setup. Use EAS Build for a simpler cloud-based solution.

## Project Structure

```
CoachMeld/
├── App.tsx                    # Main app entry point
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── BottomTabNavigator.tsx
│   │   ├── ChatInput.tsx
│   │   └── MessageBubble.tsx
│   ├── context/             # Global state management
│   │   ├── ThemeContext.tsx
│   │   └── UserContext.tsx
│   ├── screens/             # App screens
│   │   ├── ChatScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── MealPlanScreen.tsx
│   │   ├── PlaceholderScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── theme/              # Theme configuration
│   │   └── colors.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   └── utils/              # Utility functions
│       └── aiCoach.ts
├── assets/                 # Images and static assets
├── package.json
└── tsconfig.json
```

## Key Technologies

- **React Native** - Cross-platform mobile framework
- **Expo** - React Native development platform
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **Supabase** - Backend as a Service (Database, Auth, Realtime)
- **Context API** - State management
- **AsyncStorage** - Local data persistence (mobile)
- **localStorage** - Local data persistence (web)

## Features in Detail

### AI Coach
The carnivore coach provides:
- Personalized advice based on user profile
- Question repetition for clarity
- Evidence-based carnivore diet information
- Meal suggestions and tips

### User Profile
Track important health metrics:
- Height/Weight (Imperial or Metric units)
- Health goals
- Dietary preferences
- Activity level

### Theme System
- Facebook Messenger-inspired design
- Smooth transitions between themes
- Persistent theme preference

## Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run tests (when configured)
- `npm run lint` - Run linter (when configured)

### Environment Setup

1. **Backend**: Supabase is fully integrated for:
   - User authentication (email/password)
   - Profile data storage
   - Real-time chat message sync
   - Meal plans and progress tracking

2. **AI Integration**: 
   - Currently uses simulated responses
   - RAG system with vector database for knowledge retrieval
   - Edge function at `supabase/functions/ai-coach-webhook`
   - Supports personalized responses based on user context

3. **Email Confirmation** (see `supabase/README.md` for details):
   - For development: Disable in Supabase dashboard
   - For production: Configure redirect URLs and email templates

## Completed Features

- [x] Supabase backend integration (v0.2.0)
- [x] Multi-coach system with 6 diet coaches (v0.3.0)
- [x] Test user & payment simulation (v0.4.0-v0.5.0)
- [x] RAG system with vector database (v0.6.0)
- [x] Enhanced AI responses with memory (v0.6.0)
- [x] Chat export functionality (v0.6.0)
- [x] Diet selection interface (v0.6.0)

## In Development

- [ ] Stripe payment integration (v0.7.0 - Target: August 2025)
- [ ] Free tier limitations (10 messages/day)
- [ ] Premium features for Pro subscribers
- [ ] App Store & Google Play release (v1.0.0 - Target: September 2025)

## Future Enhancements

- [ ] Progress tracking with charts
- [ ] Meal photo logging
- [ ] Community features
- [ ] Apple Health / Google Fit integration
- [ ] Push notifications for meal reminders
- [ ] PDF document analysis
- [ ] Annual subscription options

## License

This project is **PROPRIETARY AND CONFIDENTIAL**.

Copyright (c) 2024 NoiseMeld. All Rights Reserved.

This software is the proprietary information of NoiseMeld. No permission is granted to use, copy, modify, distribute, or sell copies of the Software without explicit written agreement.

For licensing inquiries, please contact: michael@noisemeld.com

## Documentation

### 📚 Key Documents

#### Product & Business
- **[Product Roadmap](docs/product/PRODUCT_ROADMAP.md)** - Product vision, personas, and business strategy
- **[Release Notes](docs/product/RELEASE_NOTES.md)** - Version history and changelog (v0.6.0 Released! 🎉)

#### Development
- **[Technical Roadmap](docs/development/TECHNICAL_ROADMAP.md)** - Technical implementation plan
- **[Current Sprint](docs/development/CURRENT_SPRINT.md)** - v0.7.0 Subscription Features (NEW!)
- **[Quick Reference](docs/development/QUICK_REFERENCE.md)** - Common commands and shortcuts

#### Architecture
- **[System Architecture](docs/architecture/ARCHITECTURE.md)** - Overall system design
- **[Multi-Coach Architecture](docs/MULTI_COACH_ARCHITECTURE.md)** - Coach system design
- **[RAG Implementation](docs/architecture/RAG_IMPLEMENTATION.md)** - Knowledge base architecture

## Future Roadmap

### Planned Development (in order):
1. **AI Enhancement** - Connect RAG system with Gemini 2.5 for advanced coaching
2. **Stripe Payment Integration** - Subscription management and payment processing
3. **Mobile App Store Release** - iOS App Store and Google Play Store deployment

### Potential Future Editions:
- **Community Edition** (under consideration) - Limited features with DeepSeek AI instead of Gemini
- **Enterprise Edition** - Multi-user support, admin dashboard, analytics

## Acknowledgments

- Built with React Native and Expo
- UI inspired by Facebook Messenger
- Carnivore diet expertise based on community best practices