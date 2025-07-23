// Core Application Types
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

export interface CoachTheme {
  primary: string;
  secondary: string;
  accent: string;
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

// Database Schema Types (from Admin App)
export interface DbCoaches {
  id?: string;
  name: string;
  description?: string;
  coach_type: string;
  is_free?: boolean;
  monthly_price?: number;
  color_theme: any;
  icon_name?: string;
  features?: string[];
  knowledge_base_enabled?: boolean;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbUserCoachPreferences {
  user_id?: string;
  active_coach_id?: string;
  custom_coach_names?: any;
  favorite_coaches?: any;
  last_used_coach_id?: string;
  coach_history?: any;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentSources {
  id?: string;
  type: string;
  title: string;
  filename?: string;
  url?: string;
  content?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  file_hash?: string;
}

export interface CoachDocuments {
  id?: string;
  embedding?: number[];
  source_id?: string;
  created_at?: string;
  updated_at?: string;
  title?: string;
  is_active?: boolean;
  content?: string;
  chunk_index?: number;
}

export interface CoachDocumentAccess {
  id?: string;
  coach_id: string;
  document_id: string;
  access_level: 'free' | 'pro';
  created_at?: string;
}

export interface CoachKnowledgeBase {
  id?: string;
  coach_id?: string;
  category: string;
  subcategory?: string;
  question_patterns: string[];
  answer_template: string;
  variables?: any;
  min_confidence?: number;
  priority?: number;
  is_active?: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RagQueryCache {
  id?: string;
  query_hash: string;
  coach_id: string;
  query_text: string;
  query_embedding?: number[];
  retrieved_documents: any;
  retrieval_count?: number;
  created_at?: string;
  expires_at?: string;
  last_accessed?: string;
}

// GDPR Types
export interface GdprDeletionRequest {
  id?: string;
  user_id: string;
  user_email: string;
  request_type: 'full_deletion' | 'data_export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at?: string;
  completed_at?: string;
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Meal Planning Types
export interface Meal {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  macros?: {
    calories: number;
    protein: number; // grams
    carbs: number; // grams
    fat: number; // grams
  };
  dietTypes: string[];
  tags: string[];
  isFavorite?: boolean;
}

export interface MealPlan {
  id: string;
  userId: string;
  coachId: string;
  name: string;
  description?: string;
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
    snacks?: Meal[];
  };
  date: string; // ISO date string
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}