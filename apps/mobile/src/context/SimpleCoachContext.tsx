import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Coach } from '../types';
import { supabase } from '../lib/supabase';
import { dietCoaches } from '../data/dietCoaches';

interface CoachContextType {
  coaches: Coach[];
  activeCoach: Coach | null;
  loading: boolean;
  error: string | null;
  switchCoach: (coachId: string) => Promise<void>;
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

// Use diet coaches from the centralized configuration
const defaultCoaches: Coach[] = dietCoaches;

export const SimpleCoachProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>(defaultCoaches);
  const [activeCoach, setActiveCoach] = useState<Coach | null>(
    defaultCoaches.find(c => c.id === 'carnivore') || defaultCoaches[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Always use diet coaches for now
    // In the future, we can load user's subscriptions from database
    setCoaches(dietCoaches);
    // Set carnivore as default active coach (it's free)
    setActiveCoach(dietCoaches.find(c => c.id === 'carnivore') || dietCoaches[0]);
  }, [user]);

  const switchCoach = async (coachId: string): Promise<void> => {
    const coach = coaches.find(c => c.id === coachId);
    if (coach) {
      setActiveCoach(coach);
    }
  };

  const canAccessCoach = (coachId: string): boolean => {
    const coach = coaches.find(c => c.id === coachId);
    return coach ? (coach.isFree || coach.hasActiveSubscription || false) : false;
  };

  return (
    <CoachContext.Provider
      value={{
        coaches,
        activeCoach,
        loading,
        error,
        switchCoach,
        canAccessCoach,
      }}
    >
      {children}
    </CoachContext.Provider>
  );
};

// Export as default provider name for compatibility
export const CoachProvider = SimpleCoachProvider;