import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { STRIPE_CONFIG } from '../config/stripe';

// Conditionally import Stripe functions only on native platforms
let initStripe: any = null;
let presentPaymentSheet: any = null;
let initPaymentSheet: any = null;

if (Platform.OS !== 'web') {
  const stripeNative = require('@stripe/stripe-react-native');
  initStripe = stripeNative.initStripe;
  presentPaymentSheet = stripeNative.presentPaymentSheet;
  initPaymentSheet = stripeNative.initPaymentSheet;
}

class StripeService {
  private initialized = false;
  private isWebPlatform = Platform.OS === 'web';

  async initialize() {
    if (this.initialized || this.isWebPlatform) return;

    if (!initStripe) {
      console.warn('Stripe SDK not available on this platform');
      return;
    }

    try {
      await initStripe({
        publishableKey: STRIPE_CONFIG.publishableKey,
        merchantIdentifier: STRIPE_CONFIG.merchantIdentifier,
        urlScheme: STRIPE_CONFIG.urlScheme,
      });
      this.initialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  async createSubscription(priceId: string) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (this.isWebPlatform) {
        // For web, use Stripe Checkout
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { 
            priceId,
            successUrl: window.location.origin + '/payment-success',
            cancelUrl: window.location.origin + '/profile',
          },
        });

        if (error) throw error;

        // Redirect to Stripe Checkout
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return { success: true, checkoutUrl: data.checkoutUrl };
        } else {
          throw new Error('No checkout URL returned');
        }
      }

      // Mobile platform - use native payment sheet
      await this.initialize();

      // Call edge function to create payment intent
      const response = await supabase.functions.invoke('create-subscription', {
        body: { priceId },
      });

      if (response.error) {
        console.error('Edge function error:', response.error);
        throw response.error;
      }
      
      const { data } = response;
      
      if (!data) {
        throw new Error('No data returned from edge function');
      }
      
      // Check if the response contains an error
      if (data.error) {
        throw new Error(data.error);
      }

      const { clientSecret, ephemeralKey, customerId, subscriptionId } = data;

      if (!initPaymentSheet || !presentPaymentSheet) {
        throw new Error('Stripe SDK not available');
      }

      // Initialize payment sheet first
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        customerEphemeralKeySecret: ephemeralKey,
        customerId,
        merchantDisplayName: STRIPE_CONFIG.merchantDisplayName,
        defaultBillingDetails: {
          email: user.email,
        },
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        return { success: false, error: initError.message };
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        console.error('Payment sheet error:', presentError);
        return { success: false, error: presentError.message };
      }

      // Payment successful, update subscription in database
      await this.updateSubscriptionStatus(subscriptionId, 'active');

      return { success: true, subscriptionId };
    } catch (error: any) {
      console.error('Create subscription error:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePaymentMethod() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (this.isWebPlatform) {
        // For web, redirect to Stripe Customer Portal
        const { data, error } = await supabase.functions.invoke('create-portal-session', {
          body: { userId: user.id },
        });

        if (error) throw error;

        if (data.portalUrl) {
          window.location.href = data.portalUrl;
          return { success: true, portalUrl: data.portalUrl };
        } else {
          throw new Error('No portal URL returned');
        }
      }

      // Mobile platform - use native setup intent
      await this.initialize();

      // Get setup intent from backend
      const { data, error } = await supabase.functions.invoke('create-setup-intent', {
        body: { userId: user.id },
      });

      if (error) throw error;

      const { clientSecret, ephemeralKey, customerId } = data;

      if (!initPaymentSheet || !presentPaymentSheet) {
        throw new Error('Stripe SDK not available');
      }

      // Initialize payment sheet for setup intent
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        customerEphemeralKeySecret: ephemeralKey,
        customerId,
        merchantDisplayName: STRIPE_CONFIG.merchantDisplayName,
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        return { success: false, error: initError.message };
      }

      // Present payment sheet for updating payment method
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        return { success: false, error: presentError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Update payment method error:', error);
      return { success: false, error: error.message };
    }
  }

  async cancelSubscription() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call edge function to cancel subscription
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId: user.id },
      });

      if (error) throw error;

      // Update local subscription status
      await this.updateSubscriptionStatus(data.subscriptionId, 'canceled');

      return { success: true };
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubscriptionStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      // Return first subscription or null if none exist
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Get subscription status error:', error);
      return null;
    }
  }

  private async updateSubscriptionStatus(subscriptionId: string, status: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Update subscription status error:', error);
      throw error;
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription(): Promise<boolean> {
    const subscription = await this.getSubscriptionStatus();
    return subscription?.status === 'active' || subscription?.status === 'trialing';
  }

  // Get remaining free messages for today
  async getRemainingFreeMessages(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('message_limits')
        .select('count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error) {
        // No record for today means they haven't sent any messages
        if (error.code === 'PGRST116') {
          return 10; // Full daily limit
        }
        throw error;
      }

      return Math.max(0, 10 - (data?.count || 0));
    } catch (error) {
      console.error('Get remaining messages error:', error);
      return 0;
    }
  }

  // Increment message count for free users
  async incrementMessageCount(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Upsert message count for today
      const { error } = await supabase
        .from('message_limits')
        .upsert({
          user_id: user.id,
          date: today,
          count: 1,
        }, {
          onConflict: 'user_id,date',
          count: 'exact',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Increment message count error:', error);
    }
  }
}

export const stripeService = new StripeService();