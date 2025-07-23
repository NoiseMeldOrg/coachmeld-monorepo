# Stripe Payment Integration Plan

## Overview
This document outlines the planned Stripe integration for CoachMeld's subscription system. Implementation will occur after the AI coach system is fully operational.

## Architecture

### 1. Stripe Products & Pricing

#### Products Structure
```
CoachMeld Subscriptions
├── Carnivore Coach Pro ($9.99/month)
├── Fitness Coach Pro ($9.99/month)
├── Mindfulness Coach Pro ($9.99/month)
└── All Access Bundle ($19.99/month)
```

#### Stripe Configuration
- **Payment Methods**: Card, Apple Pay, Google Pay
- **Billing**: Monthly recurring
- **Trial Period**: 7 days free (optional)
- **Proration**: Enabled for upgrades/downgrades

### 2. Database Integration

#### Additional Fields Needed
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT UNIQUE;

-- Add to subscriptions table  
ALTER TABLE subscriptions 
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN stripe_payment_method_id TEXT,
ADD COLUMN next_billing_date TIMESTAMPTZ,
ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;

-- Stripe webhook events log
CREATE TABLE stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. API Endpoints (Supabase Edge Functions)

#### Customer Management
- `POST /stripe/create-customer` - Create Stripe customer
- `GET /stripe/customer` - Get customer details
- `PUT /stripe/update-payment-method` - Update payment method

#### Subscription Management  
- `POST /stripe/create-subscription` - Start new subscription
- `POST /stripe/update-subscription` - Change subscription
- `POST /stripe/cancel-subscription` - Cancel subscription
- `POST /stripe/reactivate-subscription` - Reactivate cancelled subscription

#### Billing
- `GET /stripe/invoices` - Get invoice history
- `GET /stripe/upcoming-invoice` - Preview next invoice
- `POST /stripe/retry-payment` - Retry failed payment

### 4. Webhook Handlers

#### Critical Events
```typescript
// Edge function: /stripe/webhook
switch(event.type) {
  case 'customer.subscription.created':
    // Activate coach access
    break;
  case 'customer.subscription.updated':
    // Update subscription status
    break;
  case 'customer.subscription.deleted':
    // Revoke coach access
    break;
  case 'invoice.payment_failed':
    // Send notification, retry logic
    break;
  case 'customer.subscription.trial_will_end':
    // Send reminder email
    break;
}
```

### 5. Frontend Implementation

#### Components
```typescript
// src/components/subscription/
├── PricingCard.tsx         // Display coach pricing
├── PaymentForm.tsx         // Stripe Elements
├── SubscriptionStatus.tsx  // Current subscription info
├── BillingHistory.tsx      // Past invoices
└── UpgradeModal.tsx        // Upgrade/downgrade flow
```

#### Screens
```typescript
// src/screens/
├── PricingScreen.tsx       // All subscription options
├── CheckoutScreen.tsx      // Payment collection
├── BillingScreen.tsx       // Manage subscription
└── PaymentSuccessScreen.tsx // Post-payment confirmation
```

### 6. Subscription States & Access Control

#### User States
1. **Free User** - Access to Basic Coach only
2. **Trial User** - Full access for 7 days
3. **Active Subscriber** - Access based on subscription
4. **Past Due** - Grace period (3 days)
5. **Cancelled** - Access until period end
6. **Expired** - Reverted to free user

#### Access Check Flow
```typescript
async function canAccessCoach(userId: string, coachId: string): boolean {
  // 1. Check if coach is free
  // 2. Check if user is test user
  // 3. Check active subscriptions
  // 4. Check grace period
  // 5. Return access decision
}
```

### 7. Testing Strategy

#### Test Mode Setup
```typescript
// Development: Use Stripe test keys
const stripe = new Stripe(
  process.env.NODE_ENV === 'production' 
    ? process.env.STRIPE_SECRET_KEY 
    : process.env.STRIPE_TEST_SECRET_KEY
);
```

#### Test Scenarios
1. Successful subscription creation
2. Payment failure handling
3. Subscription upgrade/downgrade
4. Cancellation flow
5. Reactivation after cancellation
6. Trial to paid conversion

### 8. Security Considerations

#### Best Practices
- Never store card details
- Use Stripe Elements for PCI compliance
- Implement webhook signature verification
- Use SCA-compliant payment methods
- Implement idempotency keys

#### Environment Variables
```env
# Production (future)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Development
STRIPE_TEST_SECRET_KEY=sk_test_xxx
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_xxx
```

### 9. User Experience

#### Subscription Flow
1. Browse coaches in marketplace
2. Select subscription plan
3. Enter payment details (Stripe Elements)
4. Confirm subscription
5. Instant access to coach
6. Welcome email with receipt

#### Cancellation Flow
1. Go to billing settings
2. Select "Cancel Subscription"
3. Retention offer (discount?)
4. Confirm cancellation
5. Access until period end
6. Win-back email sequence

### 10. Metrics & Analytics

#### Track in Stripe Dashboard
- MRR (Monthly Recurring Revenue)
- Churn rate
- LTV (Lifetime Value)
- Conversion rates
- Failed payment rate

#### Custom Metrics in Supabase
- Coach popularity
- Upgrade/downgrade patterns
- Feature usage by subscription tier
- Cancellation reasons

### 11. Implementation Timeline

**Phase 1: Backend Setup (Week 1)**
- Stripe account configuration
- Database schema updates
- Edge functions scaffold

**Phase 2: Payment Collection (Week 2)**
- Stripe Elements integration
- Checkout flow
- Success/error handling

**Phase 3: Subscription Management (Week 3)**
- Webhook handlers
- Status synchronization
- Access control

**Phase 4: User Interface (Week 4)**
- Billing screens
- Subscription management
- Payment history

**Phase 5: Testing & Launch (Week 5)**
- End-to-end testing
- Error scenarios
- Production deployment

### 12. Revenue Model

#### Pricing Strategy
- **Individual Coaches**: $9.99/month each
- **Bundle Discount**: All coaches for $19.99/month (33% savings)
- **Annual Option**: 2 months free (future)
- **Enterprise**: Custom pricing for organizations

#### Projected Revenue (Example)
- 100 users × $9.99 average = $999/month
- 20% bundle adoption = Higher ARPU
- Target: 1,000 paying users in 6 months

This plan provides a complete roadmap for Stripe integration, ready to implement after the RAG-enhanced coach system is operational.