# Technology Stack Decisions

## Core Technologies

### LLM Integration
- **Provider**: Google AI Studio (Gemini)
- **Why**: User preference for RAG functionality. Powerful and somewhat inexpensive.
- **Implementation**: Will integrate Gemini API for coach responses with RAG context

### Authentication & Security
- **Captcha**: Cloudflare Turnstile
- **Why**: Mitigate spam from anonymous users
- **Implementation**: Add to chat interface for non-authenticated users

### Analytics
- **Provider**: PostHog
- **Why**: Track user interactions and app usage
- **Features**: Event tracking, user journeys, feature adoption

### User Types
1. **Authenticated Users**
   - Full access to all features
   - Personalized coach interactions
   - Save chat history
   - Access premium coaches

2. **Anonymous Users**
   - Limited chat interactions
   - Cloudflare Turnstile verification
   - No chat history persistence
   - Access to free coaches only

## Implementation Priority

### Phase 1: Core App (Current)
- ✅ React Native + Expo
- ✅ TypeScript
- ✅ Supabase (Database + Auth)
- ✅ AsyncStorage
- 🔄 Fix app crash issue

### Phase 2: AI Integration
- [ ] Google AI Studio setup
- [ ] Gemini API integration
- [ ] RAG implementation with embeddings
- [ ] Response caching

### Phase 3: User Management
- [ ] Anonymous user support
- [ ] Cloudflare Turnstile integration
- [ ] Rate limiting for anonymous users
- [ ] Session management

### Phase 4: Analytics & Monitoring
- [ ] PostHog SDK integration
- [ ] Event tracking setup
- [ ] User journey mapping
- [ ] Performance monitoring

## API Keys Required

1. **Google AI Studio**
   - Get from: https://aistudio.google.com/
   - For: Gemini API access

2. **Cloudflare Turnstile**
   - Get from: https://dash.cloudflare.com/
   - For: Captcha verification

3. **PostHog**
   - Get from: https://posthog.com/
   - For: Analytics tracking

## Environment Variables to Add

```env
# AI Integration
GOOGLE_AI_API_KEY=your-gemini-api-key

# Security
CLOUDFLARE_TURNSTILE_SITE_KEY=your-site-key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your-secret-key

# Analytics
POSTHOG_PROJECT_API_KEY=your-posthog-key
POSTHOG_API_HOST=https://app.posthog.com

# Feature Flags
ENABLE_ANONYMOUS_USERS=false
ANONYMOUS_USER_DAILY_LIMIT=10
```

## Architecture Considerations

### Anonymous User Flow
```
1. User opens app without signing in
2. Can browse coaches and features
3. Starts chat → Turnstile challenge
4. Limited to X messages per day
5. Prompted to sign up for full access
```

### Gemini Integration Flow
```
1. User sends message
2. Retrieve relevant context from RAG
3. Send to Gemini with system prompt + context
4. Stream response back to user
5. Track event in PostHog
```

### Rate Limiting Strategy
- Anonymous: 10 messages/day
- Free tier: 100 messages/day
- Premium: Unlimited

## Security Considerations

1. **API Key Management**
   - Never expose keys in client code
   - Use Supabase Edge Functions for API calls
   - Implement key rotation

2. **Anonymous User Risks**
   - Implement IP-based rate limiting
   - Monitor for abuse patterns
   - Quick ban functionality

3. **Data Privacy**
   - Anonymous chats not saved
   - Clear privacy policy
   - GDPR compliance for EU users