import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration error:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    anonKey: supabaseAnonKey ? 'Set' : 'Missing'
  });
  console.warn('Supabase URL and Anon Key must be provided. Check your .env file.');
}

// Use localStorage for web, AsyncStorage for mobile
const storage = Platform.OS === 'web' ? {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
} : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (to be generated from Supabase later)
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  date_of_birth?: string | null; // ISO date string
  age: number | null; // Deprecated - calculated from date_of_birth
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_weight_kg?: number | null;
  goal: string | null;
  health_conditions: string | null;
  custom_health_conditions?: string | null; // Free-text field for additional health conditions
  carnivore_experience: string | null;
  units: 'imperial' | 'metric';
  diet_type?: 'paleo' | 'lowcarb' | 'keto' | 'ketovore' | 'carnivore' | 'lion' | null;
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  // Cooking preferences
  cooking_methods?: string[];
  favorite_foods?: string | null;
  disliked_foods?: string | null;
  allergies?: string | null;
  dietary_restrictions?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  is_user: boolean;
  created_at: string;
  coach_id?: string;
  metadata?: {
    processing_time_ms?: number;
    coach_id?: string;
  };
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  meals: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks?: string[];
  };
  macros: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  created_at: string;
}