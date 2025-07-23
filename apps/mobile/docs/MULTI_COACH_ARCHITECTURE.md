# Multi-Coach Architecture Documentation

## Overview

CoachMeld implements a subscription-based multi-coach system where users can access various specialized AI health coaches. Each coach has unique expertise and personality, with a free basic coach available to all users.

## Coach Types

### 1. Basic Health Coach (Free)
- **Description**: General health and wellness guidance
- **Features**: 
  - Pattern-based responses from knowledge base
  - Basic nutritional advice
  - General fitness tips
- **Implementation**: Local processing with pattern matching
- **Color Theme**: Default app blue (#0084ff)

### 2. Carnivore Coach Pro ($9.99/month)
- **Description**: Expert carnivore diet guidance with personalized meal plans
- **Features**:
  - Advanced carnivore expertise via Gemini 2.5
  - Personalized meal planning
  - Adaptation advice
  - Troubleshooting support
- **Implementation**: RAG-enhanced AI with specialized knowledge base
- **Color Theme**: Earthy brown (#8B4513)

### 3. Fitness Coach Pro ($9.99/month)
- **Description**: Personal training AI for strength and conditioning
- **Features**:
  - Custom workout plans
  - Form guidance
  - Progress tracking
  - Recovery optimization
- **Implementation**: RAG-enhanced AI with fitness knowledge base
- **Color Theme**: Energetic red (#FF6B6B)

### 4. Mindfulness Coach Pro ($9.99/month)
- **Description**: Mental wellness and stress management
- **Features**:
  - Meditation guidance
  - Stress reduction techniques
  - Sleep optimization
  - Habit building
- **Implementation**: RAG-enhanced AI with wellness knowledge base
- **Color Theme**: Calming teal (#4ECDC4)

## Database Architecture

### coaches table
```sql
CREATE TABLE coaches (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    coach_type TEXT NOT NULL,
    is_free BOOLEAN DEFAULT false,
    monthly_price DECIMAL(10,2),
    color_theme JSONB,
    icon_name TEXT,
    features TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### subscriptions table
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    coach_id UUID REFERENCES coaches(id),
    status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    stripe_subscription_id TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_test_subscription BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_coach_preferences table
```sql
CREATE TABLE user_coach_preferences (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    active_coach_id UUID REFERENCES coaches(id),
    custom_coach_names JSONB,
    favorite_coaches UUID[],
    last_used_coach_id UUID REFERENCES coaches(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### coach_knowledge_base table
```sql
CREATE TABLE coach_knowledge_base (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id),
    category TEXT NOT NULL,
    question_patterns TEXT[],
    answer_template TEXT,
    variables JSONB,
    min_confidence DECIMAL(3,2) DEFAULT 0.7,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## User Experience Flow

### 1. New User Onboarding
```
Sign Up → Profile Setup → Coach Selection → Start with Basic Coach → Explore Premium Coaches
```

### 2. Coach Selection
- Home screen displays coach carousel
- Tap coach card to view details
- Subscribe button for premium coaches
- Instant access for test users

### 3. Chat Experience
- Coach name and avatar in header
- Dropdown to switch coaches
- Dynamic theme based on active coach
- Context preserved when switching

### 4. Subscription Management
- View active subscriptions
- Upgrade/downgrade options
- Billing history (when Stripe integrated)
- Cancel with retention offers

## Test User System

### Enabling Test Mode
```typescript
// Set via Supabase dashboard or API
UPDATE profiles 
SET is_test_user = true,
    test_subscriptions = '["all"]'::jsonb
WHERE email = 'developer@example.com';
```

### Test User Capabilities
1. Access all coaches without payment
2. Test subscription states
3. Preview upgrade/downgrade flows
4. Generate test conversations
5. Reset chat history per coach

## Technical Implementation

### Coach Context
```typescript
interface CoachContext {
  activeCoach: Coach;
  availableCoaches: Coach[];
  switchCoach: (coachId: string) => Promise<void>;
  isLoading: boolean;
}
```

### Message Handling
```typescript
interface Message {
  id: string;
  userId: string;
  coachId: string;  // New field
  content: string;
  isUser: boolean;
  timestamp: Date;
}
```

### Coach Service Architecture
```typescript
interface CoachService {
  processMessage(message: string, context: UserContext): Promise<string>;
  getCoachMetadata(): CoachMetadata;
  validateSubscription(userId: string): Promise<boolean>;
}

// Basic coach uses local processing
class BasicCoachService implements CoachService {
  async processMessage(message: string) {
    return await matchKnowledgeBase(message);
  }
}

// Premium coaches use RAG-enhanced AI
class PremiumCoachService implements CoachService {
  async processMessage(message: string, context: UserContext) {
    return await callRAGService(this.coachId, message, context);
  }
}
```

## RAG System Integration

### Knowledge Base Structure
- Coach-specific document collections
- User context embeddings
- Research paper integration
- Personalized response generation

### Request Flow
1. User message received
2. Query vector database for relevant knowledge
3. Combine with user context
4. Generate personalized response via LLM
5. Cache results for performance

### Response Enhancement
- Evidence-based recommendations
- Source citations when applicable
- Contextual follow-up suggestions
- Personalization based on user history

## Future Enhancements

1. **Coach Combinations**
   - Bundle pricing
   - Cross-coach insights
   - Unified health dashboard

2. **Advanced Features**
   - Voice interaction
   - Image analysis (meal photos)
   - Wearable integration

3. **Community Features**
   - Coach-specific forums
   - Group challenges
   - Success stories

4. **Enterprise Options**
   - Custom coaches for organizations
   - White-label solutions
   - API access