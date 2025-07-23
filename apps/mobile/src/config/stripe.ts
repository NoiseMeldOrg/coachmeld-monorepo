// Stripe configuration
// IMPORTANT: Replace with your actual Stripe publishable key
// For development, use your test mode publishable key
// For production, use your live mode publishable key

export const STRIPE_CONFIG = {
  // Replace with your Stripe publishable key
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  
  // Merchant configuration
  merchantIdentifier: 'merchant.com.noisemeld.coachmeld',
  
  // URL scheme for redirects (used for 3D Secure, etc.)
  urlScheme: 'coachmeld',
  
  // Company name displayed in payment sheets
  merchantDisplayName: 'CoachMeld',
  
  // Subscription plans
  plans: {
    monthly: {
      priceId: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
      amount: 999, // $9.99 in cents
      interval: 'month' as const,
    },
    annual: {
      priceId: process.env.EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID || '',
      amount: 9588, // $95.88 in cents (20% discount)
      interval: 'year' as const,
    },
  },
};

// Validate configuration
export const validateStripeConfig = () => {
  if (!STRIPE_CONFIG.publishableKey) {
    console.error('Stripe publishable key is not configured');
    return false;
  }
  
  if (!STRIPE_CONFIG.plans.monthly.priceId || !STRIPE_CONFIG.plans.annual.priceId) {
    console.error('Stripe price IDs are not configured');
    return false;
  }
  
  return true;
};