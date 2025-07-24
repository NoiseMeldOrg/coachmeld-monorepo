# Console.log Migration Guide

## Overview
This guide explains how to migrate from `console.log` statements to the new structured logger utility.

## Logger Setup

### Import the Logger
```typescript
// For components/services
import { createLogger } from '@coachmeld/shared-utils';

// Create a logger with a prefix
const logger = createLogger('AuthContext');
```

### Using the Default Logger
```typescript
// For quick usage without a prefix
import { logger } from '@coachmeld/shared-utils';
```

## Migration Examples

### Basic Debug Logging
**Before:**
```typescript
console.log('User signed in:', user.email);
```

**After:**
```typescript
logger.info('User signed in', { email: user.email });
```

### Error Logging
**Before:**
```typescript
console.log('Error fetching data:', error);
console.error(error);
```

**After:**
```typescript
logger.error('Error fetching data', error);
```

### Conditional Debug Logging
**Before:**
```typescript
if (__DEV__) {
  console.log('Debug info:', data);
}
```

**After:**
```typescript
// Logger automatically handles environment-based logging
logger.debug('Debug info', data);
```

### Component Lifecycle Logging
**Before:**
```typescript
// In AuthContext.tsx
console.log('AuthContext - User:', user.email, 'isTestUser:', isTestUser);
console.log('Auth state change:', event);
```

**After:**
```typescript
// In AuthContext.tsx
const logger = createLogger('AuthContext');

logger.debug('User context updated', { 
  email: user.email, 
  isTestUser 
});
logger.info('Auth state change', { event });
```

### API Response Logging
**Before:**
```typescript
console.log('API Response:', response.data);
console.log('Status:', response.status);
```

**After:**
```typescript
logger.debug('API Response received', {
  data: response.data,
  status: response.status,
  endpoint: '/api/users'
});
```

## Log Levels Guide

### `logger.debug()`
- Development-only information
- Detailed state changes
- Component lifecycle events
- API request/response details

### `logger.info()`
- Important business events
- User actions (login, signup, purchase)
- Feature usage
- Configuration changes

### `logger.warn()`
- Recoverable errors
- Deprecated feature usage
- Performance issues
- Missing optional configuration

### `logger.error()`
- Unrecoverable errors
- Failed API calls
- Invalid state conditions
- Security violations

## Best Practices

### 1. Use Structured Context
```typescript
// ❌ Bad
logger.info(`User ${user.id} logged in from ${ip}`);

// ✅ Good
logger.info('User logged in', { userId: user.id, ip });
```

### 2. Create Component-Specific Loggers
```typescript
// In each component/service
const logger = createLogger('ComponentName');
```

### 3. Avoid Logging Sensitive Data
```typescript
// ❌ Bad
logger.info('User login', { password: user.password });

// ✅ Good
logger.info('User login', { email: user.email });
```

### 4. Use Appropriate Log Levels
```typescript
// ❌ Bad - using info for debug data
logger.info('Render count', { count: renderCount });

// ✅ Good
logger.debug('Render count', { count: renderCount });
```

## Migration Priority

### Phase 1: Critical Production Code
1. Authentication flows (`AuthContext.tsx`)
2. Payment processing (`stripeService.ts`)
3. API routes (`/api/**/*.ts`)
4. Error boundaries

### Phase 2: User-Facing Features
1. Chat services (`geminiChatService.ts`)
2. Profile management (`EditProfileScreen.tsx`)
3. Subscription management (`SubscriptionContext.tsx`)

### Phase 3: Development/Debug Code
1. Component debugging
2. State management logging
3. Development utilities

### Phase 4: Scripts (Optional)
- Migration scripts can keep console.log
- CLI tools can keep console.log
- Build scripts can keep console.log

## Environment Configuration

### Development
- All log levels enabled
- Full context included
- Timestamps shown

### Production
- Only WARN and ERROR levels
- Minimal context for performance
- Structured for log aggregation

### Test
- Only ERROR level
- Silent by default
- Can override for debugging

## Gradual Migration Strategy

1. **Add logger to new code immediately**
2. **Migrate critical paths first**
3. **Update during feature work**
4. **Use find/replace for simple cases**
5. **Review and test each change**

## Tools and Scripts

### Find Console.log Usage
```bash
# Count by file
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | wc -l

# List files to migrate
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" -l
```

### ESLint Rule (Future)
```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

## Questions?
- Check the logger source: `packages/shared-utils/src/logger.ts`
- Review the implementation plan: `docs/CODE_QUALITY_IMPROVEMENT_PLAN.md`
- Ask in code review for complex migrations