import { supabase } from '../lib/supabase';
import { TestUserType } from '../types';
import { isTestEmail, getTestExpirationDate } from '../config/testUsers';

export interface TestUserConfig {
  email: string;
  isTestUser: boolean;
  testSubscriptions: string[]; // coach IDs or 'all'
  testUserType?: TestUserType;
  testExpiresAt?: Date;
}

/**
 * Enable or disable test user status for a user
 */
export async function setTestUserStatus(
  userId: string, 
  isTestUser: boolean,
  userType: TestUserType = TestUserType.BETA_TESTER,
  metadata?: any
) {
  try {
    const expiresAt = isTestUser && userType === TestUserType.BETA_TESTER 
      ? getTestExpirationDate('beta') 
      : null;

    console.log('setTestUserStatus called with:', {
      userId,
      isTestUser,
      userType,
      expiresAt,
      metadata
    });

    const updateData = {
      is_test_user: isTestUser,
      test_subscriptions: isTestUser ? ['all'] : [],
      test_user_type: isTestUser ? userType : TestUserType.NONE,
      test_expires_at: expiresAt,
      test_user_metadata: metadata || {},
    };

    console.log('Updating profile with:', updateData);

    // First ensure profile exists
    try {
      const { data: ensureResult, error: ensureError } = await supabase
        .rpc('ensure_profile_exists', { user_id: userId });
      
      if (ensureError) {
        console.error('Error ensuring profile exists:', ensureError);
        throw ensureError;
      }
      
      console.log('Profile ensure result:', ensureResult);
    } catch (err) {
      console.error('Failed to ensure profile exists:', err);
      throw new Error('Failed to ensure profile exists before setting test user status');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('Profile update successful:', data);
    return { success: true };
  } catch (error) {
    console.error('Error setting test user status:', error);
    return { success: false, error };
  }
}

/**
 * Create test data for development
 */
export async function createTestData(userId: string) {
  try {
    // Get the free carnivore coach for sample messages
    const { data: freeCoach, error: coachError } = await supabase
      .from('coaches')
      .select('id, coach_type')
      .eq('is_active', true)
      .eq('is_free', true)
      .eq('coach_type', 'carnivore')
      .single();

    if (coachError) throw coachError;

    // Create sample messages only for the free coach
    const sampleMessages = [
      { isUser: true, content: "Hi, I'm new to the carnivore diet. Where should I start?" },
      { isUser: false, content: "Welcome! I'm excited to help you on your carnivore journey. The best place to start is with simple, high-quality meats..." },
      { isUser: true, content: "What about electrolytes?" },
      { isUser: false, content: "Great question! Electrolytes are crucial when starting carnivore. I recommend..." },
    ];

    if (freeCoach) {
      for (const msg of sampleMessages) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            user_id: userId,
            coach_id: freeCoach.id,
            content: msg.content,
            is_user: msg.isUser,
          });

        if (msgError) console.error(`Error creating test message:`, msgError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating test data:', error);
    return { success: false, error };
  }
}

/**
 * Clear all test data for a user
 */
export async function clearTestData(userId: string) {
  try {
    // Delete test subscriptions
    const { error: subError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('is_test_subscription', true);

    if (subError) throw subError;

    // Optionally clear messages
    // const { error: msgError } = await supabase
    //   .from('messages')
    //   .delete()
    //   .eq('user_id', userId);

    return { success: true };
  } catch (error) {
    console.error('Error clearing test data:', error);
    return { success: false, error };
  }
}

/**
 * Quick function to check if current user is test user
 */
export async function isCurrentUserTestUser(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('is_test_user')
      .eq('id', user.id)
      .single();

    if (error) {
      // If profile doesn't exist, try to ensure it exists
      if (error.code === 'PGRST116') {
        try {
          await supabase.rpc('ensure_profile_exists', { user_id: user.id });
          // Try again
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('is_test_user')
            .eq('id', user.id)
            .single();
          
          if (!retryError && retryData) {
            return retryData.is_test_user || false;
          }
        } catch (err) {
          console.error('Error ensuring profile exists:', err);
        }
      }
      throw error;
    }
    return data?.is_test_user || false;
  } catch (error) {
    console.error('Error checking test user status:', error);
    return false;
  }
}

/**
 * Check and auto-enroll test users based on email domain
 */
export async function checkAndEnrollTestUser(email: string, userId: string) {
  try {
    const testStatus = isTestEmail(email);
    
    if (!testStatus.isTest) {
      return { enrolled: false };
    }

    const userType = testStatus.type === 'partner' 
      ? TestUserType.PARTNER 
      : TestUserType.BETA_TESTER;

    const metadata = {
      source: 'email_domain' as const,
      enrolledAt: new Date().toISOString(),
      email: email,
    };

    const result = await setTestUserStatus(userId, true, userType, metadata);
    
    if (result.success) {
      console.log(`Auto-enrolled test user: ${email} as ${userType}`);
      return { enrolled: true, userType };
    }
    
    return { enrolled: false, error: result.error };
  } catch (error) {
    console.error('Error auto-enrolling test user:', error);
    return { enrolled: false, error };
  }
}

/**
 * Check if test user access has expired
 */
export async function checkTestUserExpiration(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_test_user, test_expires_at, test_user_type')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, ensure it exists first
      if (error.code === 'PGRST116') {
        try {
          await supabase.rpc('ensure_profile_exists', { user_id: userId });
          // Profile didn't exist, so no test user status
          return false;
        } catch (err) {
          console.error('Error ensuring profile exists:', err);
        }
      }
      throw error;
    }
    
    if (!data?.is_test_user) return false;
    
    // Permanent access types don't expire
    if (data.test_user_type === TestUserType.PARTNER || 
        data.test_user_type === TestUserType.INTERNAL) {
      return false;
    }
    
    // Check expiration
    if (data.test_expires_at) {
      const expirationDate = new Date(data.test_expires_at);
      const hasExpired = expirationDate < new Date();
      
      if (hasExpired) {
        // Automatically disable test access
        await setTestUserStatus(userId, false);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking test user expiration:', error);
    return false;
  }
}

/**
 * Simulate a test payment for testing payment flows
 */
export async function simulateTestPayment(
  userId: string,
  planId: string,
  coachId?: string
): Promise<{ success: boolean; subscriptionId?: string; error?: any }> {
  try {
    // Verify user is a test user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_test_user')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_test_user) {
      throw new Error('Only test users can simulate payments');
    }

    // Handle bundle subscriptions
    if (planId === 'bundle_all_diet' || planId === 'bundle_all_access') {
      let query = supabase
        .from('coaches')
        .select('id, coach_type')
        .eq('is_free', false)
        .eq('is_active', true);

      // Diet bundle - only diet coaches
      if (planId === 'bundle_all_diet') {
        const dietTypes = ['carnivore', 'paleo', 'keto', 'lowcarb', 'ketovore', 'lion'];
        query = query.in('coach_type', dietTypes);
      }
      // All access bundle - all premium coaches (no filter needed)

      const { data: coaches, error: coachError } = await query;

      if (coachError) throw coachError;

      // Create subscriptions for selected coaches
      for (const coach of coaches || []) {
        const subscriptionData = {
          user_id: userId,
          coach_id: coach.id,
          status: 'active' as const,
          is_test_subscription: true,
          start_date: new Date().toISOString(),
          stripe_subscription_id: `test_${planId}_${Date.now()}_${coach.id}`,
          metadata: {
            bundle: true,
            bundleId: planId,
            bundleType: planId === 'bundle_all_diet' ? 'diet' : 'all_access',
          },
        };

        await supabase
          .from('subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'user_id,coach_id,status',
          });
      }

      return { 
        success: true, 
        subscriptionId: planId 
      };
    }

    // Regular single coach subscription
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('coach_id', coachId || planId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      // Subscription already exists, just return it
      return { 
        success: true, 
        subscriptionId: existingSubscription.id 
      };
    }

    // Create a test subscription
    const subscriptionData = {
      user_id: userId,
      coach_id: coachId || planId,
      status: 'active' as const,
      is_test_subscription: true,
      start_date: new Date().toISOString(),
      stripe_subscription_id: `test_sub_${Date.now()}`,
      test_payment_metadata: {
        simulatedAt: new Date().toISOString(),
        planId,
        amount: 999, // $9.99 in cents
        currency: 'usd',
      },
    };

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) throw subError;

    return { 
      success: true, 
      subscriptionId: subscription.id 
    };
  } catch (error) {
    console.error('Error simulating test payment:', error);
    return { success: false, error };
  }
}