import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, Profile as DBProfile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

const PROFILE_KEY = '@CoachMeld:localProfile';

export function useHybridProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Try loading from Supabase first
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.log('Failed to load from Supabase, trying local storage:', error);
        // If Supabase fails, load from local storage
        await loadFromLocalStorage();
      } else if (data) {
        // Successfully loaded from Supabase
        const userProfile = dbProfileToUserProfile(data);
        setProfile(userProfile);
        // Update local storage with latest data
        await saveToLocalStorage(userProfile);
      } else {
        // No profile in Supabase, check local storage
        await loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback to local storage
      await loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        console.log('Loaded profile from local storage');
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading from local storage:', error);
    }
  };

  const saveToLocalStorage = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      console.log('Profile saved to local storage');
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  const saveProfile = async (newProfile: UserProfile): Promise<void> => {
    if (!user) throw new Error('No user logged in');

    // Always update local state and storage immediately
    setProfile(newProfile);
    await saveToLocalStorage(newProfile);

    // Try to save to Supabase
    const dbProfile = userProfileToDbProfile(user.id, user.email!, newProfile);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(dbProfile, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Failed to save to Supabase, but local storage updated:', error);
        // Don't throw - we've saved locally
      } else {
        console.log('Profile saved to Supabase successfully');
      }
    } catch (error) {
      console.error('Error saving to Supabase, but local storage updated:', error);
      // Don't throw - we've saved locally
    }
  };

  const syncWithSupabase = async () => {
    if (!user || !profile) return;

    try {
      const dbProfile = userProfileToDbProfile(user.id, user.email!, profile);
      const { error } = await supabase
        .from('profiles')
        .upsert(dbProfile, {
          onConflict: 'id'
        });

      if (!error) {
        console.log('Profile synced with Supabase');
      }
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
    }
  };

  return {
    profile,
    loading,
    saveProfile,
    refreshProfile: loadProfile,
    syncWithSupabase,
  };
}

// Convert database profile to app UserProfile
function dbProfileToUserProfile(dbProfile: DBProfile): UserProfile {
  // Convert height from cm to inches if imperial
  const isImperial = dbProfile.units === 'imperial';
  const height = isImperial && dbProfile.height_cm 
    ? Math.round(dbProfile.height_cm / 2.54)
    : dbProfile.height_cm || 0;

  // Convert weight from kg to lbs if imperial
  const weight = isImperial && dbProfile.weight_kg
    ? Math.round(dbProfile.weight_kg * 2.20462)
    : dbProfile.weight_kg || 0;

  // Convert goal weight from kg to lbs if imperial
  const goalWeight = isImperial && dbProfile.goal_weight_kg
    ? Math.round(dbProfile.goal_weight_kg * 2.20462)
    : dbProfile.goal_weight_kg || weight;

  return {
    name: dbProfile.full_name || '',
    dateOfBirth: dbProfile.date_of_birth || undefined,
    age: dbProfile.age || 0,
    gender: dbProfile.gender || '',
    height,
    weight,
    goalWeight,
    units: dbProfile.units || 'imperial',
    healthGoals: parseJsonArray(dbProfile.goal),
    dietaryPreferences: parseJsonArray(dbProfile.carnivore_experience),
    healthConditions: parseJsonArray(dbProfile.health_conditions),
    customHealthConditions: dbProfile.custom_health_conditions || '',
    activityLevel: dbProfile.activity_level || 'moderately_active',
    dietType: dbProfile.diet_type as any,
    // Cooking preferences
    cookingMethods: dbProfile.cooking_methods || [],
    favoriteFoods: dbProfile.favorite_foods || '',
    dislikedFoods: dbProfile.disliked_foods || '',
    allergies: dbProfile.allergies || '',
    dietaryRestrictions: dbProfile.dietary_restrictions || '',
  };
}

// Convert app UserProfile to database profile
function userProfileToDbProfile(userId: string, email: string, profile: UserProfile): Partial<DBProfile> {
  // Always store height in cm and weight in kg in database
  const heightCm = profile.height
    ? (profile.units === 'imperial' ? Math.round(profile.height * 2.54) : profile.height)
    : null;

  const weightKg = profile.weight
    ? (profile.units === 'imperial' ? Math.round(profile.weight / 2.20462) : profile.weight)
    : null;

  const goalWeightKg = profile.goalWeight
    ? (profile.units === 'imperial' ? Math.round(profile.goalWeight / 2.20462) : profile.goalWeight)
    : null;

  return {
    id: userId,
    email,
    full_name: profile.name || null,
    date_of_birth: profile.dateOfBirth || null,
    age: profile.age || null,
    gender: (profile.gender || null) as 'male' | 'female' | 'other' | null,
    height_cm: heightCm,
    weight_kg: weightKg,
    goal_weight_kg: goalWeightKg,
    goal: profile.healthGoals.join(', ') || null,
    health_conditions: profile.healthConditions.join(', ') || null,
    custom_health_conditions: profile.customHealthConditions || null,
    carnivore_experience: profile.dietaryPreferences.join(', ') || null,
    units: profile.units,
    activity_level: profile.activityLevel,
    diet_type: profile.dietType || null,
    // Cooking preferences
    cooking_methods: profile.cookingMethods || [],
    favorite_foods: profile.favoriteFoods || null,
    disliked_foods: profile.dislikedFoods || null,
    allergies: profile.allergies || null,
    dietary_restrictions: profile.dietaryRestrictions || null,
  };
}

// Parse comma-separated string to array
function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}