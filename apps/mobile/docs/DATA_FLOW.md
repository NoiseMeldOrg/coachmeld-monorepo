# CoachMeld Data Flow Documentation

## Data Flow Overview

This document describes how data flows through the CoachMeld application, from user input to backend services and back to the UI.

## Main Data Flow Diagram

```mermaid
graph TB
    %% User Layer
    subgraph "User Interface"
        UI[User Input]
        Display[UI Display]
    end
    
    %% Component Layer
    subgraph "React Components"
        Screen[Screen Component]
        State[Local State]
        Context[Context API]
    end
    
    %% Service Layer
    subgraph "Service Layer"
        AIService[AI Coach Service]
        AuthService[Auth Service]
        DataService[Data Service]
    end
    
    %% Storage Layer
    subgraph "Storage"
        LocalStorage[AsyncStorage]
        CloudDB[(Supabase DB)]
        AIProvider[AI API<br/>Gemini 2.5]
    end
    
    %% Flow
    UI --> Screen
    Screen --> State
    State --> Context
    Context --> AIService
    Context --> AuthService
    Context --> DataService
    
    AIService --> AIProvider
    AuthService --> CloudDB
    DataService --> CloudDB
    DataService --> LocalStorage
    
    CloudDB --> DataService
    LocalStorage --> DataService
    AIProvider --> AIService
    
    DataService --> Context
    AuthService --> Context
    AIService --> Context
    Context --> State
    State --> Screen
    Screen --> Display
    
    %% Styling
    classDef ui fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef component fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef service fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef storage fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    
    class UI,Display ui
    class Screen,State,Context component
    class AIService,AuthService,DataService service
    class LocalStorage,CloudDB,AIProvider storage
```

## Detailed Data Flows

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant AuthScreen
    participant AuthContext
    participant Supabase
    participant AsyncStorage
    
    User->>AuthScreen: Enter credentials
    AuthScreen->>AuthContext: signIn(email, password)
    AuthContext->>Supabase: auth.signIn()
    Supabase-->>AuthContext: Session + User
    AuthContext->>AsyncStorage: Store session
    AuthContext-->>AuthScreen: Success
    AuthScreen-->>User: Navigate to app
```

### 2. Chat Message Flow

```mermaid
sequenceDiagram
    participant User
    participant ChatScreen
    participant CoachContext
    participant AIService
    participant AsyncStorage
    participant AI_API
    
    User->>ChatScreen: Type message
    ChatScreen->>ChatScreen: Update local state
    User->>ChatScreen: Send message
    ChatScreen->>AsyncStorage: Save message
    ChatScreen->>CoachContext: Get coach config
    CoachContext-->>ChatScreen: Coach data
    ChatScreen->>AIService: processMessage()
    AIService->>AI_API: Generate response
    AI_API-->>AIService: AI response
    AIService->>AsyncStorage: Save response
    AIService-->>ChatScreen: Display response
    ChatScreen-->>User: Show conversation
```

### 3. Profile Update Flow

```mermaid
sequenceDiagram
    participant User
    participant ProfileScreen
    participant UserContext
    participant Validation
    participant Supabase
    participant AsyncStorage
    
    User->>ProfileScreen: Edit profile
    ProfileScreen->>Validation: Validate input
    Validation-->>ProfileScreen: Valid/Invalid
    ProfileScreen->>UserContext: updateProfile()
    UserContext->>UserContext: Optimistic update
    UserContext->>AsyncStorage: Cache update
    UserContext->>Supabase: Update profile
    Supabase-->>UserContext: Confirmation
    UserContext-->>ProfileScreen: Success
    ProfileScreen-->>User: Show updated profile
```

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;                    // UUID from Supabase Auth
  email: string;                 // User email
  full_name: string;            // Display name
  age: number;                  // User age
  gender: 'male' | 'female' | 'other';
  height: number;               // In inches or cm
  weight: number;               // In lbs or kg
  goals: string[];              // Health goals
  dietary_restrictions: string[];
  units: 'imperial' | 'metric';
  created_at: string;           // ISO timestamp
  updated_at: string;           // ISO timestamp
}
```

### Chat Message
```typescript
interface Message {
  id: string;                   // UUID
  text: string;                 // Message content
  sender: 'user' | 'ai';       // Message source
  timestamp: string;            // ISO timestamp
  coachId?: string;            // Which coach responded
  metadata?: {
    processingTime?: number;    // Response time in ms
    model?: string;            // AI model used
    error?: boolean;           // If message failed
  };
}
```

### Coach Configuration
```typescript
interface Coach {
  id: string;                  // UUID
  name: string;                // Display name
  avatar: string;              // Image URL
  specialty: string;           // Coach focus area
  tier: 'free' | 'premium';    // Access level
  systemPrompt: string;        // AI instruction
  responseStyle: {
    tone: string;              // Friendly, professional, etc
    expertise: string[];       // Knowledge areas
    personality: string;       // Coach personality
  };
}
```

## API Integration Points

### Supabase APIs

#### Authentication
```typescript
// Sign Up
supabase.auth.signUp({ email, password })

// Sign In
supabase.auth.signIn({ email, password })

// Sign Out
supabase.auth.signOut()

// Session Management
supabase.auth.onAuthStateChange((event, session) => {})
```

#### Database Operations
```typescript
// Fetch Profile
supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// Update Profile
supabase
  .from('profiles')
  .update(updates)
  .eq('id', userId)

// Real-time Subscriptions
supabase
  .from('messages')
  .on('INSERT', handleNewMessage)
  .subscribe()
```

### AI Service Integration

```typescript
// Current Mock Implementation
async function generateAIResponse(message: string, coach: Coach): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate contextual response
  return generateResponse(message, coach);
}

// Future Gemini Integration
async function generateAIResponse(message: string, coach: Coach): Promise<string> {
  const response = await geminiAPI.generateContent({
    model: 'gemini-2.5-pro',
    systemInstruction: coach.systemPrompt,
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  });
  
  return response.text();
}
```

## Caching Strategy

### Local Cache Layers

1. **Memory Cache** (React State)
   - Active session data
   - Current conversation
   - UI state

2. **AsyncStorage** (Persistent)
   - User preferences
   - Offline messages
   - Coach selection
   - Theme preference

3. **Supabase Cache** (Server)
   - User profiles
   - Historical data
   - Subscription status

### Cache Invalidation
```mermaid
graph LR
    A[Data Update] --> B{Update Type}
    B -->|User Action| C[Invalidate Local]
    B -->|Server Push| D[Invalidate All]
    B -->|Time Based| E[TTL Expiry]
    
    C --> F[Fetch Fresh Data]
    D --> F
    E --> F
    
    F --> G[Update Cache]
    G --> H[Update UI]
```

## Error Handling

### Error Flow
```typescript
try {
  // Attempt operation
  const result = await apiCall();
  
  // Update local state
  setState(result);
  
  // Cache result
  await AsyncStorage.setItem(key, result);
} catch (error) {
  // Log error
  console.error('Operation failed:', error);
  
  // Update UI with error state
  setError(error.message);
  
  // Attempt recovery
  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    setState(cached);
    showToast('Using cached data');
  }
}
```

## Performance Optimizations

### Data Fetching Strategies

1. **Prefetching**
   - Load coach data on app start
   - Prefetch common responses
   - Cache meal suggestions

2. **Lazy Loading**
   - Load messages on scroll
   - Defer heavy computations
   - Progressive image loading

3. **Batching**
   - Batch API requests
   - Combine state updates
   - Debounce user input

### Real-time Sync
```typescript
// Efficient real-time sync
const subscription = supabase
  .from('messages')
  .on('INSERT', (payload) => {
    // Only update if relevant
    if (payload.new.chat_id === currentChatId) {
      setMessages(prev => [...prev, payload.new]);
    }
  })
  .subscribe();
```

## Security Considerations

### Data Protection

1. **In Transit**
   - HTTPS for all API calls
   - Certificate pinning (future)
   - Request signing

2. **At Rest**
   - Encrypted AsyncStorage
   - Secure key management
   - No sensitive data in logs

3. **Access Control**
   - Row Level Security (RLS)
   - JWT token validation
   - Session expiry handling