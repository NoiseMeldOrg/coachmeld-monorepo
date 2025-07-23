import React from 'react';
import { Platform } from 'react-native';
import { STRIPE_CONFIG, validateStripeConfig } from '../config/stripe';

interface StripeProviderWrapperProps {
  children: React.ReactElement | React.ReactElement[];
}

// Conditionally import Stripe only on native platforms
let StripeProvider: any = null;
if (Platform.OS !== 'web') {
  StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
}

export const StripeProviderWrapper: React.FC<StripeProviderWrapperProps> = ({ children }) => {
  // Only initialize Stripe if configuration is valid and on native platform
  const isConfigValid = validateStripeConfig();
  const isNativePlatform = Platform.OS !== 'web';

  if (!isConfigValid || !isNativePlatform || !StripeProvider) {
    if (!isNativePlatform) {
      console.info('Stripe is not supported on web platform. Payment features are disabled.');
    } else if (!isConfigValid) {
      console.warn('Stripe configuration is incomplete. Payment features will be disabled.');
    }
    return <React.Fragment>{children}</React.Fragment>;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_CONFIG.publishableKey}
      merchantIdentifier={STRIPE_CONFIG.merchantIdentifier}
      urlScheme={STRIPE_CONFIG.urlScheme}
    >
      {children}
    </StripeProvider>
  );
};