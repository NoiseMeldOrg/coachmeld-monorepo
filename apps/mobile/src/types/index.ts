export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
  coachId?: string;
  coachName?: string;
}

export interface UserProfile {
  name?: string;
  dateOfBirth?: string; // ISO date string
  age?: number; // Computed from dateOfBirth, kept for backward compatibility
  gender?: 'male' | 'female' | 'other' | '';
  height?: number;
  weight?: number;
  goalWeight?: number;
  units: 'imperial' | 'metric';
  healthGoals: string[];
  dietaryPreferences: string[];
  healthConditions: string[];
  customHealthConditions?: string; // Free-text field for additional health conditions
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  dietType?: 'paleo' | 'lowcarb' | 'keto' | 'ketovore' | 'carnivore' | 'lion';
  // Cooking preferences
  cookingMethods?: string[];
  favoriteFoods?: string;
  dislikedFoods?: string;
  allergies?: string;
  dietaryRestrictions?: string;
}

export interface Coach {
  id: string;
  name: string;
  description: string;
  coachType: 'paleo' | 'lowcarb' | 'keto' | 'ketovore' | 'carnivore' | 'lion' | 'fitness' | 'mindfulness';
  isFree: boolean;
  monthlyPrice: number;
  colorTheme: CoachTheme;
  iconName: string;
  iconLibrary?: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome';
  iconRotation?: number; // Icon rotation in degrees (negative = counter-clockwise)
  features: string[];
  isActive: boolean;
  hasActiveSubscription?: boolean;
  customName?: string; // User's custom name for the coach
  dailyMessageLimit?: number; // Daily message limit for free coaches
  // Free tier support for premium coaches
  freeTierEnabled?: boolean;
  freeTierDailyLimit?: number;
  freeTierFeatures?: string[];
}

export interface CoachTheme {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Subscription {
  id: string;
  userId: string;
  coachId: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'paused';
  startDate: Date;
  endDate?: Date;
  isTestSubscription: boolean;
}

export interface UserCoachPreferences {
  userId: string;
  activeCoachId: string;
  customCoachNames: Record<string, string>;
  favoriteCoaches: string[];
  lastUsedCoachId?: string;
}

export enum TestUserType {
  NONE = 'none',              // Regular user
  BETA_TESTER = 'beta',       // Time-limited full access
  PARTNER = 'partner',        // Permanent full access
  INVESTOR = 'investor',      // Full access + analytics
  INTERNAL = 'internal'       // Full access + admin features
}

export interface TestUserProfile {
  is_test_user: boolean;
  test_user_type: TestUserType;
  test_expires_at?: Date;
  test_metadata: {
    source: 'email_domain' | 'invite_code' | 'manual';
    invited_by?: string;
    notes?: string;
  };
}