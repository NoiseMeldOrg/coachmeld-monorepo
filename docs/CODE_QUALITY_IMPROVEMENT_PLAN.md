# Code Quality Improvement Plan

## Overview
This document outlines the gradual improvement plan for TypeScript strictness and console.log cleanup across the CoachMeld monorepo.

## Current State Analysis

### TypeScript Configuration
- **Mobile App**: Uses `expo/tsconfig.base` with `strict: true` but `skipLibCheck: true`
- **Admin App**: Uses Next.js config with `strict: true` but `skipLibCheck: true`
- **Good News**: Both apps already have strict mode enabled ✅
- **Issue**: `skipLibCheck: true` skips type checking of declaration files

### Console.log Usage
- **Total**: 318 console.log statements across the codebase
- **Mobile App**: 152 instances
- **Admin App**: 166 instances
- **Main Categories**:
  - Debug logging in development
  - Error tracking
  - User action tracking
  - API response logging
  - Build/script output

## Improvement Plan

### Phase 1: Create Logging Infrastructure (Week 1)

#### 1.1 Create Shared Logger Utility
```typescript
// packages/shared-utils/src/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

#### 1.2 Environment-Aware Implementation
- Development: Full logging to console
- Production: Only warnings and errors
- Test: Silent or minimal logging
- Support structured logging for better debugging

### Phase 2: TypeScript Strictness - Low Risk (Week 2)

#### 2.1 Remove skipLibCheck Gradually
1. **Start with Admin App** (fewer dependencies)
   - Remove `skipLibCheck` from tsconfig.json
   - Fix any type errors in @types packages
   - Add specific excludes if needed

2. **Then Mobile App**
   - More complex due to React Native ecosystem
   - May need to add type definitions for untyped packages
   - Consider using `typeRoots` to manage custom types

#### 2.2 Add Stricter Compiler Options
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Phase 3: Console.log Migration - By Category (Weeks 3-4)

#### 3.1 Priority Order
1. **Production Code** (highest priority)
   - Authentication flows
   - Payment processing
   - User data handling
   - API routes

2. **Development/Debug Code**
   - Component lifecycle logging
   - State debugging
   - API response logging

3. **Scripts and Build Tools** (lowest priority)
   - Can keep console.log for CLI output
   - Migration scripts
   - Development tools

#### 3.2 Migration Strategy
```typescript
// Before
console.log('User signed in:', user.email);

// After
logger.info('User signed in', { email: user.email });
```

### Phase 4: CI/CD Integration (Week 5)

#### 4.1 Enforce Standards
1. Add ESLint rule to warn on console.log
2. Create pre-commit hook for new console.log statements
3. Update GitHub Actions to enforce TypeScript strictness

#### 4.2 Monitoring
- Track type coverage percentage
- Monitor console.log count in CI
- Generate reports on code quality metrics

## Implementation Timeline

### Week 1: Infrastructure
- [ ] Create shared logger package
- [ ] Add logger to both apps
- [ ] Document usage patterns

### Week 2: TypeScript - Admin App
- [ ] Remove skipLibCheck from admin
- [ ] Fix type errors
- [ ] Add stricter options

### Week 3: TypeScript - Mobile App
- [ ] Remove skipLibCheck from mobile
- [ ] Add missing type definitions
- [ ] Fix type errors

### Week 4: Console.log Migration - Critical
- [ ] Replace console.log in auth flows
- [ ] Replace console.log in payment code
- [ ] Replace console.log in API routes

### Week 5: Console.log Migration - Non-Critical
- [ ] Replace debug logging
- [ ] Update component logging
- [ ] Clean up remaining instances

### Week 6: CI/CD and Documentation
- [ ] Update ESLint rules
- [ ] Add pre-commit hooks
- [ ] Update developer documentation

## Success Metrics

1. **TypeScript Coverage**
   - 100% of files type-checked (no skipLibCheck)
   - Zero `any` types in production code
   - All strict mode checks passing

2. **Logging Quality**
   - Zero console.log in production code
   - Structured logging for better debugging
   - Environment-aware log levels

3. **Developer Experience**
   - Clear migration guide
   - Helpful error messages
   - Gradual rollout prevents disruption

## Risk Mitigation

1. **Type Definition Issues**
   - Create local type definitions as needed
   - Submit PRs to DefinitelyTyped for missing types
   - Use `// @ts-expect-error` sparingly with TODOs

2. **Breaking Changes**
   - Test thoroughly in development
   - Use feature flags for gradual rollout
   - Keep old logging temporarily with deprecation warnings

3. **Performance Impact**
   - Ensure logger has minimal overhead
   - Use lazy evaluation for expensive operations
   - Consider log sampling in production

## Next Steps

1. Review and approve this plan
2. Create shared-utils logger package
3. Begin Phase 1 implementation
4. Set up weekly progress reviews

---

This plan ensures gradual, safe improvements to code quality without disrupting development velocity.