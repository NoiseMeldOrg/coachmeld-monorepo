import React, { createContext, useState, useContext, useEffect } from 'react';
import { UserProfile } from '../types';
import { useAuth } from './AuthContext';
// Use hybrid approach: Supabase with local storage fallback
import { useHybridProfile } from '../hooks/useHybridProfile';
import { calculateAge } from '../utils/dateUtils';

interface UserContextType {
  userProfile: UserProfile | null;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
  isProfileComplete: boolean;
  loading: boolean;
}

const defaultProfile: UserProfile = {
  name: '',
  dateOfBirth: undefined,
  age: 0,
  gender: '',
  height: 0,
  weight: 0,
  goalWeight: 0,
  units: 'imperial',
  healthGoals: [],
  dietaryPreferences: [],
  healthConditions: [],
  activityLevel: 'moderately_active',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { profile: storedProfile, loading, saveProfile } = useHybridProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Calculate age from dateOfBirth when profile loads
  useEffect(() => {
    if (storedProfile) {
      const age = storedProfile.dateOfBirth ? calculateAge(storedProfile.dateOfBirth) : storedProfile.age || 0;
      setProfile({ ...storedProfile, age });
    } else {
      setProfile(null);
    }
  }, [storedProfile]);

  const isProfileComplete = profile !== null && 
    profile.name !== undefined && profile.name !== '' && 
    (profile.dateOfBirth !== undefined || (profile.age !== undefined && profile.age > 0)) && 
    profile.height !== undefined && profile.height > 0 && 
    profile.weight !== undefined && profile.weight > 0;

  const updateUserProfile = async (newProfile: UserProfile) => {
    // Calculate age if dateOfBirth is provided
    if (newProfile.dateOfBirth) {
      newProfile.age = calculateAge(newProfile.dateOfBirth);
    }
    // Allow saving without user in development
    await saveProfile(newProfile);
    setProfile(newProfile);
  };

  return (
    <UserContext.Provider value={{ 
      userProfile: profile, 
      updateUserProfile, 
      isProfileComplete,
      loading 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};