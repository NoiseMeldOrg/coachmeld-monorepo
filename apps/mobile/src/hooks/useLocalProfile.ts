import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const PROFILE_KEY = '@CoachMeld:localProfile';

export function useSupabaseProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading profile from local storage:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile): Promise<void> => {
    try {
      console.log('Saving profile to local storage:', newProfile);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      console.log('Profile saved successfully to local storage');
    } catch (error) {
      console.error('Error saving profile to local storage:', error);
      throw error;
    }
  };

  return {
    profile,
    loading,
    saveProfile,
    refreshProfile: loadProfile,
  };
}