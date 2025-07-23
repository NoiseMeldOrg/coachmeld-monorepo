import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { checkAndEnrollTestUser } from '../utils/testUserUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
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
        console.error('Session error:', error);
        // Clear invalid session if refresh token is invalid
        if (error.message.includes('Refresh Token Not Found') || 
            error.message.includes('Invalid Refresh Token')) {
          console.log('Clearing invalid session');
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
      console.error('Error getting session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
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
      console.error('Sign in error:', err);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An error occurred during sign in' 
        } 
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Starting signup for:', email);
      console.log('Supabase client:', supabase ? 'Initialized' : 'Not initialized');
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
        console.error('Signup error:', error);
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
        console.log('User created successfully:', data.user.id);
        console.log('Ensuring profile exists...');
        
        // Call the database function to ensure profile exists
        try {
          const { data: profileResult, error: profileError } = await supabase
            .rpc('ensure_profile_exists', { user_id: data.user.id });
          
          if (profileError) {
            console.error('Error ensuring profile exists:', profileError);
          } else {
            console.log('Profile ensure result:', profileResult);
          }
        } catch (err) {
          console.error('Failed to ensure profile exists:', err);
        }
        
        // Check and auto-enroll test users based on email domain
        if (data.user.email) {
          console.log('Checking test user enrollment for:', data.user.email);
          
          try {
            const enrollResult = await checkAndEnrollTestUser(data.user.email, data.user.id);
            console.log('Test user enrollment result:', enrollResult);
          } catch (enrollError) {
            console.error('Error during test user enrollment:', enrollError);
          }
        }
      }

      return { error };
    } catch (err) {
      console.error('Unexpected error during signup:', err);
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
        
        console.log('Cleared all local storage data');
      } catch (storageError) {
        console.error('Error clearing local storage:', storageError);
      }
      
      // Clear local state regardless of error
      setSession(null);
      setUser(null);
      return { error };
    } catch (err) {
      console.error('Sign out error:', err);
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