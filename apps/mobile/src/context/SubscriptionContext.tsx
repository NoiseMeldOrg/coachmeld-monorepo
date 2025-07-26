import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Subscription } from '../types';
import { supabase } from '../lib/supabase';
import { stripeService } from '../services/stripeService';
import { STRIPE_CONFIG } from '../config/stripe';
// Temporarily disable logger import  
// import { createLogger } from '@coachmeld/shared-utils';

const logger = {
  info: (msg: string, context?: any) => console.info(msg, context),
  error: (msg: string, error?: any) => console.error(msg, error)
};

interface SubscriptionContextType {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  hasActiveSubscription: boolean;
  remainingFreeMessages: number;
  
  // Test user functions
  createTestSubscription: (coachId: string) => Promise<void>;
  cancelTestSubscription: (coachId: string) => Promise<void>;
  toggleTestSubscriptionStatus: (subscriptionId: string, status: Subscription['status']) => Promise<void>;
  
  // Stripe functions
  subscribeToPlan: (planType: 'monthly' | 'annual') => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  updatePaymentMethod: () => Promise<{ success: boolean; error?: string }>;
  
  refreshSubscriptions: () => Promise<void>;
  checkMessageLimit: () => Promise<boolean>;
  incrementMessageCount: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [remainingFreeMessages, setRemainingFreeMessages] = useState(10);

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    } else {
      setSubscriptions([]);
      setLoading(false);
    }
  }, [user]);

  const loadSubscriptions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First check if user still exists
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser.user) {
        logger.info('User no longer authenticated, skipping subscription load');
        setSubscriptions([]);
        setHasActiveSubscription(false);
        setRemainingFreeMessages(10);
        return;
      }

      // Load subscriptions from database
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Don't throw for common errors like no rows found
        if (error.code === 'PGRST116') {
          setSubscriptions([]);
          setHasActiveSubscription(false);
          setRemainingFreeMessages(10);
          return;
        }
        throw error;
      }

      const formattedSubscriptions: Subscription[] = (data || []).map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        coachId: sub.coach_id,
        status: sub.status,
        startDate: new Date(sub.start_date),
        endDate: sub.end_date ? new Date(sub.end_date) : undefined,
        isTestSubscription: sub.is_test_subscription,
      }));

      setSubscriptions(formattedSubscriptions);

      // Check if user has active subscription
      try {
        const activeStatus = await stripeService.hasActiveSubscription();
        setHasActiveSubscription(activeStatus);

        // Get remaining free messages if no active subscription
        if (!activeStatus) {
          const remaining = await stripeService.getRemainingFreeMessages();
          setRemainingFreeMessages(remaining);
        } else {
          setRemainingFreeMessages(-1); // Unlimited for pro users
        }
      } catch (stripeError) {
        logger.error('Error checking Stripe status', stripeError);
        // Don't fail the whole load if Stripe check fails
        setHasActiveSubscription(false);
        setRemainingFreeMessages(10);
      }
    } catch (err) {
      logger.error('Error loading subscriptions', err);
      // Don't show error toast for expected scenarios
      if (err instanceof Error && err.message.includes('JWT')) {
        // User session is invalid, don't show error
        setSubscriptions([]);
        setHasActiveSubscription(false);
        setRemainingFreeMessages(10);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
      }
    } finally {
      setLoading(false);
    }
  };

  // Test user functions
  const createTestSubscription = async (coachId: string) => {
    if (!user) return;

    try {
      // Check if user is test user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_test_user')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile.is_test_user) {
        throw new Error('Only test users can create test subscriptions');
      }

      // Create test subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          coach_id: coachId,
          status: 'active',
          is_test_subscription: true,
          start_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await loadSubscriptions();
    } catch (err) {
      logger.error('Error creating test subscription', err, { coachId });
      setError(err instanceof Error ? err.message : 'Failed to create test subscription');
    }
  };

  const cancelTestSubscription = async (coachId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          end_date: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('coach_id', coachId)
        .eq('is_test_subscription', true);

      if (error) throw error;

      await loadSubscriptions();
    } catch (err) {
      logger.error('Error cancelling test subscription', err, { coachId });
      setError(err instanceof Error ? err.message : 'Failed to cancel test subscription');
    }
  };

  const toggleTestSubscriptionStatus = async (subscriptionId: string, status: Subscription['status']) => {
    if (!user) return;

    try {
      const updateData: any = { status };
      
      if (status === 'cancelled' || status === 'expired') {
        updateData.end_date = new Date().toISOString();
      } else if (status === 'active') {
        updateData.end_date = null;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .eq('is_test_subscription', true);

      if (error) throw error;

      await loadSubscriptions();
    } catch (err) {
      logger.error('Error updating test subscription', err, { subscriptionId, status });
      setError(err instanceof Error ? err.message : 'Failed to update test subscription');
    }
  };

  // Stripe functions
  const subscribeToPlan = async (planType: 'monthly' | 'annual') => {
    try {
      setError(null);
      
      // Get the price ID based on plan type
      const priceId = STRIPE_CONFIG.plans[planType].priceId;
      
      logger.debug('Starting subscription process', { 
        planType, 
        priceId,
        stripeConfigKeys: Object.keys(STRIPE_CONFIG)
      });
      
      if (!priceId) {
        throw new Error('Price ID not configured');
      }

      // Create subscription via Stripe
      const result = await stripeService.createSubscription(priceId);
      
      if (result.success) {
        // Reload subscriptions to get updated status
        await loadSubscriptions();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const cancelSubscription = async () => {
    try {
      setError(null);
      
      const result = await stripeService.cancelSubscription();
      
      if (result.success) {
        // Reload subscriptions to get updated status
        await loadSubscriptions();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updatePaymentMethod = async () => {
    try {
      setError(null);
      
      const result = await stripeService.updatePaymentMethod();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment method';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Message limit functions
  const checkMessageLimit = async (): Promise<boolean> => {
    if (hasActiveSubscription) return true;
    
    const remaining = await stripeService.getRemainingFreeMessages();
    setRemainingFreeMessages(remaining);
    return remaining > 0;
  };

  const incrementMessageCount = async () => {
    if (hasActiveSubscription) return;
    
    await stripeService.incrementMessageCount();
    const remaining = await stripeService.getRemainingFreeMessages();
    setRemainingFreeMessages(remaining);
  };

  const refreshSubscriptions = async () => {
    await loadSubscriptions();
  };

  const value: SubscriptionContextType = {
    subscriptions,
    loading,
    error,
    hasActiveSubscription,
    remainingFreeMessages,
    createTestSubscription,
    cancelTestSubscription,
    toggleTestSubscriptionStatus,
    subscribeToPlan,
    cancelSubscription,
    updatePaymentMethod,
    refreshSubscriptions,
    checkMessageLimit,
    incrementMessageCount,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};