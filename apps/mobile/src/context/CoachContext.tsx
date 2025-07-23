import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Coach, Subscription, UserCoachPreferences } from '../types';
import { supabase } from '../lib/supabase';

interface CoachContextType {
  coaches: Coach[];
  activeCoach: Coach | null;
  subscriptions: Subscription[];
  preferences: UserCoachPreferences | null;
  loading: boolean;
  error: string | null;
  isTestUser: boolean;
  
  // Actions
  switchCoach: (coachId: string) => Promise<void>;
  setCustomCoachName: (coachId: string, name: string) => Promise<void>;
  refreshCoaches: () => Promise<void>;
  canAccessCoach: (coachId: string) => boolean;
}

const CoachContext = createContext<CoachContextType | undefined>(undefined);

export const useCoach = () => {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error('useCoach must be used within a CoachProvider');
  }
  return context;
};

export const CoachProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [activeCoach, setActiveCoach] = useState<Coach | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [preferences, setPreferences] = useState<UserCoachPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTestUser, setIsTestUser] = useState(false);

  useEffect(() => {
    if (user) {
      loadCoachData();
    } else {
      resetState();
    }
  }, [user]);

  const resetState = () => {
    setCoaches([]);
    setActiveCoach(null);
    setSubscriptions([]);
    setPreferences(null);
    setIsTestUser(false);
    setLoading(false);
  };

  const loadCoachData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load only diet coaches
      const dietCoachTypes = ['carnivore', 'paleo', 'keto', 'ketovore', 'lowcarb', 'lion'];
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .in('coach_type', dietCoachTypes)
        .order('sort_order');

      if (coachesError) throw coachesError;

      // Load user's subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trial']);

      if (subscriptionsError) throw subscriptionsError;

      // Load user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_coach_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        throw preferencesError;
      }

      // Check if user is test user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_test_user')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist (PGRST116), try to ensure it exists
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, attempting to create...');
          try {
            const { data: ensureResult, error: ensureError } = await supabase
              .rpc('ensure_profile_exists', { user_id: user.id });
            
            if (!ensureError && ensureResult?.success) {
              // Try to fetch profile again
              const { data: retryData, error: retryError } = await supabase
                .from('profiles')
                .select('is_test_user')
                .eq('id', user.id)
                .single();
              
              if (!retryError && retryData) {
                // Use the retry data
                setIsTestUser(retryData.is_test_user || false);
              } else {
                // Still failed, use default
                console.error('Failed to fetch profile after creation:', retryError);
                setIsTestUser(false);
              }
            } else {
              console.error('Failed to ensure profile exists:', ensureError);
              setIsTestUser(false);
            }
          } catch (err) {
            console.error('Error ensuring profile exists:', err);
            setIsTestUser(false);
          }
        } else {
          // Other error, log it but don't throw
          console.error('Error fetching profile:', profileError);
          setIsTestUser(false);
        }
      } else {
        // Profile fetched successfully
        setIsTestUser(profileData.is_test_user || false);
      }

      // Format coaches with subscription status
      const formattedCoaches: Coach[] = coachesData.map(coach => {
        // Override icon names from database to match our design
        let iconName = coach.icon_name;
        if (coach.coach_type === 'carnivore' && (coach.icon_name === 'silverware-fork-knife' || coach.icon_name === 'restaurant')) {
          iconName = 'food-steak';
        }
        
        // Determine icon library based on icon name if not provided
        let iconLibrary = coach.icon_library;
        if (!iconLibrary) {
          // MaterialCommunityIcons icons (check after icon name override)
          const materialIcons = ['food-steak', 'food-drumstick', 'paw', 'silverware-fork-knife'];
          iconLibrary = materialIcons.includes(iconName) ? 'MaterialCommunityIcons' : 'Ionicons';
        }

        return {
          id: coach.id,
          name: coach.name,
          description: coach.description,
          coachType: coach.coach_type,
          isFree: coach.is_free,
          monthlyPrice: coach.monthly_price,
          colorTheme: coach.color_theme,
          iconName: iconName,
          iconLibrary: iconLibrary,
          iconRotation: coach.icon_rotation || 0,
          features: coach.features,
          isActive: coach.is_active,
          hasActiveSubscription: coach.is_free || 
            subscriptionsData.some(sub => sub.coach_id === coach.id),
          customName: preferencesData?.custom_coach_names?.[coach.id],
          freeTierEnabled: coach.free_tier_enabled,
          freeTierDailyLimit: coach.free_tier_daily_limit,
          freeTierFeatures: coach.free_tier_features,
        };
      });

      setCoaches(formattedCoaches);
      setSubscriptions(subscriptionsData);
      
      console.log('CoachContext - User:', user.email, 'isTestUser:', isTestUser);
      console.log('CoachContext - Subscriptions:', subscriptionsData.length, subscriptionsData);
      console.log('CoachContext - Coaches with access:', formattedCoaches.filter(c => c.hasActiveSubscription).map(c => c.name));

      // Set preferences or create default
      if (preferencesData) {
        setPreferences({
          userId: user.id,
          activeCoachId: preferencesData.active_coach_id,
          customCoachNames: preferencesData.custom_coach_names || {},
          favoriteCoaches: preferencesData.favorite_coaches || [],
          lastUsedCoachId: preferencesData.last_used_coach_id,
        });

        // Set active coach
        const active = formattedCoaches.find(c => c.id === preferencesData.active_coach_id);
        setActiveCoach(active || formattedCoaches.find(c => c.isFree) || null);
      } else {
        // Set default to free coach
        const freeCoach = formattedCoaches.find(c => c.isFree);
        if (freeCoach) {
          setActiveCoach(freeCoach);
          await createDefaultPreferences(user.id, freeCoach.id);
        }
      }

    } catch (err) {
      console.error('Error loading coach data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load coaches');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async (userId: string, defaultCoachId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_coach_preferences')
        .insert({
          user_id: userId,
          active_coach_id: defaultCoachId,
          custom_coach_names: {},
          favorite_coaches: [],
          last_used_coach_id: defaultCoachId,
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences({
        userId,
        activeCoachId: defaultCoachId,
        customCoachNames: {},
        favoriteCoaches: [],
        lastUsedCoachId: defaultCoachId,
      });
    } catch (err) {
      console.error('Error creating default preferences:', err);
    }
  };

  const switchCoach = async (coachId: string) => {
    if (!user || !canAccessCoach(coachId)) {
      setError('You do not have access to this coach');
      return;
    }

    const coach = coaches.find(c => c.id === coachId);
    if (!coach) {
      setError('Coach not found');
      return;
    }

    try {
      setActiveCoach(coach);

      // Update preferences
      const { error } = await supabase
        .from('user_coach_preferences')
        .upsert({
          user_id: user.id,
          active_coach_id: coachId,
          last_used_coach_id: coachId,
        });

      if (error) throw error;

      if (preferences) {
        setPreferences({
          ...preferences,
          activeCoachId: coachId,
          lastUsedCoachId: coachId,
        });
      }
    } catch (err) {
      console.error('Error switching coach:', err);
      setError('Failed to switch coach');
    }
  };

  const setCustomCoachName = async (coachId: string, name: string) => {
    if (!user || !preferences) return;

    try {
      const updatedNames = {
        ...preferences.customCoachNames,
        [coachId]: name,
      };

      const { error } = await supabase
        .from('user_coach_preferences')
        .update({
          custom_coach_names: updatedNames,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences({
        ...preferences,
        customCoachNames: updatedNames,
      });

      // Update coach in list
      setCoaches(coaches.map(c => 
        c.id === coachId ? { ...c, customName: name } : c
      ));

      if (activeCoach?.id === coachId) {
        setActiveCoach({ ...activeCoach, customName: name });
      }
    } catch (err) {
      console.error('Error setting custom coach name:', err);
      setError('Failed to update coach name');
    }
  };

  const canAccessCoach = (coachId: string): boolean => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return false;
    
    // Allow access if:
    // 1. Coach is free
    // 2. User has active subscription
    // 3. Coach has free tier enabled (limited access)
    return coach.isFree || coach.hasActiveSubscription || coach.freeTierEnabled || false;
  };

  const refreshCoaches = async () => {
    await loadCoachData();
  };

  const value: CoachContextType = {
    coaches,
    activeCoach,
    subscriptions,
    preferences,
    loading,
    error,
    isTestUser,
    switchCoach,
    setCustomCoachName,
    refreshCoaches,
    canAccessCoach,
  };

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
};