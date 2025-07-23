# Current Sprint - v0.7.0 Development

**Sprint Goal:** Implement Subscription & Premium Features  
**Target Release:** August 2025  
**Current Date:** June 27, 2025  
**Sprint Status:** Planning Phase

## Overview

With v0.6.0 successfully released yesterday, we're now focusing on monetization through subscription tiers and premium features.

## Sprint Objectives

1. **Stripe Payment Integration** - Enable real payment processing
2. **Subscription Tiers** - Implement Free vs Pro access control
3. **Premium Features** - Build advanced capabilities for Pro users
4. **Usage Limits** - Implement message limits for free tier
5. **Upgrade Flow** - Create seamless upgrade experience

## Current Tasks

### 🔴 High Priority

#### Payment Infrastructure
- [ ] Integrate Stripe SDK
- [ ] Create payment endpoints in Supabase
- [ ] Implement subscription webhook handlers
- [ ] Add payment method management UI
- [ ] Create billing history screen

#### Subscription Management
- [ ] Extend subscription context for real payments
- [ ] Implement subscription status checking
- [ ] Add subscription expiry handling
- [ ] Create subscription renewal logic
- [ ] Build promo code system

#### Free Tier Limitations
- [ ] Implement 10 messages/day limit
- [ ] Create message counter UI
- [ ] Add "upgrade for unlimited" prompts
- [ ] Implement basic response mode for free tier
- [ ] Add daily limit reset logic

### 🟡 Medium Priority

#### Premium Features
- [ ] Advanced meal planning system
- [ ] Macro tracking integration
- [ ] Shopping list generator
- [ ] Recipe database access
- [ ] Priority AI response queue

#### Upgrade Experience
- [ ] Design paywall screens
- [ ] Create feature comparison table
- [ ] Implement upgrade CTAs throughout app
- [ ] Add "Pro" badges to premium features
- [ ] Create onboarding for new Pro users

### 🟢 Low Priority

#### Analytics & Monitoring
- [ ] Payment success/failure tracking
- [ ] Conversion funnel analytics
- [ ] Subscription churn monitoring
- [ ] Feature usage analytics
- [ ] Revenue dashboard

## Technical Considerations

### Stripe Integration
```typescript
// Required Stripe products:
- Customer management
- Subscription billing
- Payment methods
- Webhooks for events
- Invoice generation
```

### Database Schema Updates
```sql
-- Extend subscriptions table
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN current_period_end TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER,
  currency TEXT,
  status TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Message Limiting Logic
```typescript
// Track daily message count
interface MessageLimit {
  userId: string;
  date: string;
  count: number;
  limit: number;
}

// Check before sending message
const canSendMessage = async (userId: string): Promise<boolean> => {
  if (hasProSubscription(userId)) return true;
  
  const today = new Date().toISOString().split('T')[0];
  const messageCount = await getMessageCount(userId, today);
  
  return messageCount < FREE_TIER_LIMIT;
};
```

## Definition of Done

- [ ] All payment flows tested with test cards
- [ ] Subscription upgrade/downgrade working
- [ ] Free tier limits enforced correctly
- [ ] Premium features accessible only to Pro users
- [ ] Analytics tracking implemented
- [ ] Error handling for failed payments
- [ ] Documentation updated

## Blockers & Risks

1. **Stripe Account Setup** - Need production Stripe account
2. **App Store Policies** - Must use in-app purchases for iOS
3. **Price Testing** - Need to validate $9.99/mo price point
4. **Free Tier Limits** - 10 messages might be too restrictive

## Next Sprint Preview (v1.0.0)

After completing subscription features, we'll focus on:
- App store submission preparation
- Performance optimization
- Marketing website
- Launch campaign materials
- User onboarding improvements

## Notes

- Consider A/B testing different price points
- May need to implement annual subscription option
- Should add grace period for expired subscriptions
- Need to handle currency conversion for international users

---

**Last Updated:** June 27, 2025  
**Next Review:** July 7, 2025