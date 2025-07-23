/**
 * Test User Configuration
 * Manages email domains and settings for automatic test user enrollment
 */

export const TEST_USER_CONFIG = {
  // Email domains that automatically get test access
  TEST_DOMAINS: [
    '@test.coachmeld.com', // Test subdomain
    '@beta.coachmeld.com', // Beta testers
  ],
  
  // Partner domains get permanent access
  PARTNER_DOMAINS: [
    '@noisemeld.com',      // Your team - permanent access
    '@partner.example.com', // Add partner domains here
  ],
  
  // Default test period in days
  DEFAULT_TEST_PERIOD_DAYS: 90,
  
  // Test payment card numbers (Stripe test mode)
  TEST_CARDS: {
    SUCCESS: '4242424242424242',
    DECLINE: '4000000000000002',
    INSUFFICIENT_FUNDS: '4000000000009995',
  },
  
  // Test user features
  FEATURES: {
    UNLIMITED_MESSAGES: true,
    ALL_COACHES: true,
    EXPORT_DATA: true,
    PRIORITY_SUPPORT: false,
    ANALYTICS_ACCESS: false,
  }
};

/**
 * Check if an email should get automatic test access
 */
export const isTestEmail = (email: string): { isTest: boolean; type: 'beta' | 'partner' | null } => {
  const lowerEmail = email.toLowerCase();
  
  // Check partner domains first (permanent access)
  if (TEST_USER_CONFIG.PARTNER_DOMAINS.some(domain => lowerEmail.endsWith(domain))) {
    return { isTest: true, type: 'partner' };
  }
  
  // Check test domains (time-limited access)
  if (TEST_USER_CONFIG.TEST_DOMAINS.some(domain => lowerEmail.endsWith(domain))) {
    return { isTest: true, type: 'beta' };
  }
  
  return { isTest: false, type: null };
};

/**
 * Calculate test expiration date based on user type
 */
export const getTestExpirationDate = (userType: 'beta' | 'partner'): Date | null => {
  if (userType === 'partner') {
    return null; // No expiration for partners
  }
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + TEST_USER_CONFIG.DEFAULT_TEST_PERIOD_DAYS);
  return expirationDate;
};