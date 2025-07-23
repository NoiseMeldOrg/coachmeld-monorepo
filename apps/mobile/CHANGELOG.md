# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-01-26

### Added
- Complete diet selection interface with 6 diet coaches (Paleo, Low Carb, Keto, Ketovore, Carnivore, Lion)
- RAG (Retrieval-Augmented Generation) system integration with Gemini API
- Conversation memory service for context retention across chat sessions
- Export chat functionality supporting text, HTML, and JSON formats
- Enhanced test user system with Beta, Partner, and Investor tiers
- Modal presentation for chat screen with improved navigation
- Facebook Messenger-style timestamps in chat
- User context document system for personalized AI responses
- Diet-specific knowledge base for each coach type
- Payment simulation for development/testing

### Changed
- Chat screen now opens as modal with back button
- Typing indicator redesigned with coach icon
- Improved keyboard handling with fixed header positioning
- Enhanced error handling with retry logic and fallback responses
- Better navigation types for TypeScript support
- Updated documentation structure under /docs directory

### Fixed
- Chat screen header movement when keyboard opens
- Typing indicator background styling
- Navigation type errors in HomeScreen
- Chat input box positioning on different devices
- Coach icon warnings and styling inconsistencies

### Technical
- Integrated Gemini API for embeddings and chat
- Implemented ConversationMemoryService for AI context
- Added UserContextService for profile-based personalization
- Enhanced ExportService with multiple format support
- Improved error boundaries and error handling service

## [0.5.0] - 2025-01-20

### Added
- Basic AI coach responses with diet-specific personalities
- User profile system with diet preferences
- Subscription context and marketplace screens
- Diet coach data structure
- Error handling improvements

### Changed
- Enhanced coach system with more detailed attributes
- Improved chat UI with better message formatting
- Updated navigation structure

## [0.4.0] - 2025-01-20

### Added
- Complete app navigation with 5 tabs (Home, Progress, Coach, Meals, Profile)
- Working coach selection system with 3 default coaches
- Real-time chat interface with simulated coach responses
- Meal planning screen with personalized macro calculations
- Profile management with theme toggle and user settings
- Progress tracking placeholder screen
- Dark/Light theme persistence
- Simple coach context for easier state management

### Changed
- Reordered navigation: Progress tab now left of Coach tab
- Meals tab moved to right of Coach tab
- Profile icon changed to person-circle for better visibility
- Improved home screen with horizontal coach selector
- Enhanced error handling and provider ordering

### Fixed
- Critical APK crash on launch (provider ordering issue)
- Context import conflicts between original and simple implementations
- Coach selection not persisting to chat screen
- Theme toggle not working consistently
- Navigation to Profile instead of Settings

### Technical
- Migrated to SimpleCoachContext for reliability
- Fixed useAuth/AuthProvider ordering dependency
- Synchronized version numbers with GitHub releases

## [0.3.0] - Previous Release
- Initial navigation structure
- Basic screens implementation

## [0.2.0] - Previous Release
- Context providers setup
- Theme implementation

## [0.1.0] - Previous Release
- Initial project setup
- Basic React Native configuration