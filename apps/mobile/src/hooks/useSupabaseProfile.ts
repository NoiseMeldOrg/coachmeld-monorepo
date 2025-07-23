import { useState, useEffect } from 'react';
import { supabase, Profile as DBProfile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

export function useSupabaseProfile() {
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      if (data) {
        setProfile(dbProfileToUserProfile(data));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile): Promise<void> => {
    if (!user) throw new Error('No user logged in');

    const dbProfile = userProfileToDbProfile(user.id, user.email!, newProfile);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(dbProfile, {
          onConflict: 'id'
        });

      if (error) throw error;

      setProfile(newProfile);
    } catch (error) {
      console.error('Error saving profile:', error);
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
    age: dbProfile.age || 0,
    gender: dbProfile.gender || '',
    height,
    weight,
    goalWeight,
    units: dbProfile.units || 'imperial',
    healthGoals: parseJsonArray(dbProfile.goal),
    dietaryPreferences: parseJsonArray(dbProfile.carnivore_experience),
    healthConditions: parseJsonArray(dbProfile.health_conditions),
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
    age: profile.age || null,
    gender: (profile.gender || null) as 'male' | 'female' | 'other' | null,
    height_cm: heightCm,
    weight_kg: weightKg,
    goal_weight_kg: goalWeightKg,
    goal: profile.healthGoals.join(', ') || null,
    health_conditions: profile.healthConditions.join(', ') || null,
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