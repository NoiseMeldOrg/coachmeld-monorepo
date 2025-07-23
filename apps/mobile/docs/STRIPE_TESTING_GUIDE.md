# Stripe Testing Guide

## Overview
This guide covers testing the Stripe payment integration in CoachMeld. The app will remain in Stripe TEST MODE until the v1.0.0 production launch (September 2025).

**IMPORTANT**: All payments are in TEST MODE. No real charges will occur. Use only test cards listed below.

## Prerequisites

### 1. Environment Setup
Ensure your `.env.local` file has the test mode keys:
```env
# Test Mode Keys (use these for development)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...
```

### 2. Stripe Dashboard Configuration
1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to Test Mode** (switch at the top right)
3. Create test products and prices:
   - Product: "CoachMeld Pro"
   - Monthly Price: $9.99 recurring
   - Annual Price: $95.88 recurring (20% discount)

### 3. Supabase Edge Functions
Ensure the following secrets are set in Supabase:
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Test Cards

### Successful Payment Cards
| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Succeeds immediately |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0027 6000 3184` | Requires authentication (EU cards) |

### Failure Test Cards
| Card Number | Description | Error |
|-------------|-------------|-------|
| `4000 0000 0000 9995` | Declined | `card_declined` |
| `4000 0000 0000 0002` | Declined | `generic_decline` |
| `4000 0000 0000 9987` | Declined | `insufficient_funds` |
| `4000 0000 0000 0069` | Expired card | `expired_card` |
| `4000 0000 0000 0127` | Incorrect CVC | `incorrect_cvc` |

### Special Test Scenarios
| Card Number | Description |
|-------------|-------------|
| `4000 0000 0000 0341` | Attaches but fails on payment |
| `4000 0000 0000 1976` | Payment succeeds after retry |
| `5555 5555 5555 4444` | Mastercard test |
| `3782 822463 10005` | American Express test |

**Note**: Use any future expiration date (e.g., 12/34) and any 3-digit CVC (4-digit for Amex).

## Testing Scenarios

### 1. New Subscription Flow
```
1. Navigate to Profile → Manage Subscription
2. Select Monthly or Annual plan
3. Enter test card: 4242 4242 4242 4242
4. Complete payment
5. Verify:
   - Subscription status updates
   - Access to all coaches granted
   - Payment confirmation shown
```

### 2. 3D Secure Authentication
```
1. Use card: 4000 0025 0000 3155
2. Complete the authentication challenge
3. Verify payment succeeds after authentication
```

### 3. Payment Failure Handling
```
1. Use card: 4000 0000 0000 9995
2. Verify:
   - Error message displays
   - User can retry with different card
   - Subscription remains inactive
```

### 4. Free Tier Message Limits
```
1. Sign in as free user
2. Send 10 messages (daily limit)
3. Verify:
   - Warning appears at 5 messages remaining
   - Block at 0 messages
   - Upgrade prompt shown
```

## Platform-Specific Testing

### iOS Testing
1. Use Expo Go app or development build
2. Apple Pay available in production builds only
3. Test cards work in Stripe payment sheet

### Android Testing
1. Use Expo Go app or development build
2. Google Pay available in production builds only
3. Test cards work in Stripe payment sheet

### Web Testing
1. Uses Stripe Checkout (redirect flow)
2. Returns to success/cancel URLs
3. Same test cards apply

## Debugging Common Issues

### "No such price" Error
**Issue**: Price ID exists in live mode but using test keys
**Solution**: Create products in test mode, update `.env.local` with test price IDs

### "No authorization header" Error
**Issue**: Edge function not receiving auth token
**Solution**: Check Supabase client configuration, ensure user is logged in

### Payment Sheet Not Appearing
**Issue**: Stripe SDK initialization failed
**Solution**: 
- Check publishable key is correct
- Ensure `@stripe/stripe-react-native` is properly installed
- Rebuild the app after package installation

### Subscription Not Activating
**Issue**: Webhook not processing
**Solution**:
- Verify webhook endpoint in Stripe Dashboard
- Check webhook secret is correct
- Monitor edge function logs for errors

## Webhook Testing

### Local Testing with Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

### Production Webhook Events
Monitor these critical events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Test User Scenarios

### Scenario 1: Trial to Paid Conversion
```
1. Create new account
2. Use free tier (10 messages/day)
3. Hit message limit
4. Upgrade to Pro
5. Verify unlimited access
```

### Scenario 2: Subscription Cancellation
```
1. Active Pro subscriber
2. Cancel subscription
3. Verify:
   - Access continues until period end
   - Renewal disabled
   - Reverts to free tier after expiry
```

### Scenario 3: Payment Method Update
```
1. Active subscriber
2. Update payment method
3. Use new test card
4. Verify update succeeds
```

## Environment Variables Reference

### Required for Testing
```env
# Stripe Test Mode
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...

# Supabase Edge Functions
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Required for Production (v1.0.0+)
```env
# Stripe Live Mode (DO NOT commit to git)
# These will be configured when v1.0.0 launches in September 2025
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...

# Supabase Edge Functions
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Note**: Production keys will not be used until v1.0.0 launch. Continue using test keys for all development and beta testing.

## Security Best Practices

1. **Never commit live keys** to version control
2. **Always use test mode** for development
3. **Verify webhook signatures** in production
4. **Use HTTPS** for all API calls
5. **Implement idempotency** for payment operations
6. **Log but don't store** sensitive payment data

## Support Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Stripe React Native SDK](https://stripe.com/docs/stripe-react-native)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)