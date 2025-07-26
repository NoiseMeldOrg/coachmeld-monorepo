import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { checkAndEnrollTestUser } from '../utils/testUserUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Temporarily disable logger import
// import { createLogger } from '@coachmeld/shared-utils';

const logger = {
  info: (msg: string, context?: any) => console.info(msg, context),
  error: (msg: string, error?: any) => console.error(msg, error)
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, privacyAccepted?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Session error', error);
        // Clear invalid session if refresh token is invalid
        if (error.message.includes('Refresh Token Not Found') || 
            error.message.includes('Invalid Refresh Token')) {
          logger.info('Clearing invalid session');
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch((err) => {
      logger.error('Error getting session', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state change', { event });
        if (event === 'TOKEN_REFRESHED') {
          logger.debug('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          logger.info('User signed out');
        }
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      logger.error('Sign in error', err);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An error occurred during sign in' 
        } 
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, privacyAccepted: boolean = false) => {
    try {
      logger.info('Starting signup', { email });
      logger.debug('Supabase client status', { initialized: !!supabase });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.origin : '') : 'coachmeld://signup-confirm',
        },
      });
      
      if (error) {
        logger.error('Signup error', error);
        return { error };
      }

      if (!error && data.user) {
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          // User needs to confirm email
          return { 
            error: { 
              message: 'Please check your email to confirm your account before signing in.' 
            } 
          };
        }
        
        // The profile is created automatically by database trigger
        logger.info('User created successfully', { userId: data.user.id });
        logger.debug('Ensuring profile exists...');
        
        // Call the database function to ensure profile exists
        try {
          const { data: profileResult, error: profileError } = await supabase
            .rpc('ensure_profile_exists', { user_id: data.user.id });
          
          if (profileError) {
            logger.error('Error ensuring profile exists', profileError);
          } else {
            logger.debug('Profile ensure result', { result: profileResult });
          }
        } catch (err) {
          logger.error('Failed to ensure profile exists', err);
        }
        
        // Check and auto-enroll test users based on email domain
        if (data.user.email) {
          logger.info('Checking test user enrollment', { email: data.user.email });
          
          try {
            const enrollResult = await checkAndEnrollTestUser(data.user.email, data.user.id);
            logger.info('Test user enrollment result', { result: enrollResult });
          } catch (enrollError) {
            logger.error('Error during test user enrollment', enrollError);
          }
        }
        
        // Track privacy policy acceptance if provided
        if (privacyAccepted) {
          logger.info('Recording privacy policy acceptance', { userId: data.user.id });
          
          try {
            const { error: disclaimerError } = await supabase
              .from('disclaimer_acceptances')
              .insert({
                user_id: data.user.id,
                disclaimer_type: 'privacy_policy',
                accepted_at: new Date().toISOString(),
                user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
                version: '1.0' // Privacy policy version
              });
            
            if (disclaimerError) {
              logger.error('Error recording privacy policy acceptance', disclaimerError);
            } else {
              logger.info('Privacy policy acceptance recorded successfully');
            }
            
            // Also update the GDPR consent fields in the profile
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({
                gdpr_consent_date: new Date().toISOString(),
                data_processing_consent: true
              })
              .eq('id', data.user.id);
            
            if (profileUpdateError) {
              logger.error('Error updating GDPR consent in profile', profileUpdateError);
            } else {
              logger.info('GDPR consent updated in profile successfully');
            }
          } catch (trackingError) {
            logger.error('Error tracking privacy policy acceptance', trackingError);
          }
        }
      }

      return { error };
    } catch (err) {
      logger.error('Unexpected error during signup', err);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred during signup' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Clear all local storage data
      try {
        // Clear specific keys we know about
        await AsyncStorage.removeItem('@CoachMeld:localProfile');
        await AsyncStorage.removeItem('@CoachMeld:theme');
        await AsyncStorage.removeItem('@CoachMeld:messages');
        await AsyncStorage.removeItem('@CoachMeld:selectedCoach');
        
        // Clear all keys that start with @CoachMeld
        const allKeys = await AsyncStorage.getAllKeys();
        const coachMeldKeys = allKeys.filter(key => key.startsWith('@CoachMeld'));
        if (coachMeldKeys.length > 0) {
          await AsyncStorage.multiRemove(coachMeldKeys);
        }
        
        logger.info('Cleared all local storage data');
      } catch (storageError) {
        logger.error('Error clearing local storage', storageError);
      }
      
      // Clear local state regardless of error
      setSession(null);
      setUser(null);
      return { error };
    } catch (err) {
      logger.error('Sign out error', err);
      // Still clear local state on error
      setSession(null);
      setUser(null);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An error occurred during sign out' 
        } 
      };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'coachmeld://reset-password',
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};