import { supabase } from '../lib/supabase';
import { GeminiChatService } from './geminiChatService';
import { UserProfile } from '../types';
import { logger } from '@coachmeld/shared-utils';

export interface Recipe {
  id?: string;
  name: string;
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  cookingMethod?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  ingredients: string[];
  instructions: string[];
  tags?: string[];
  isFavorite?: boolean;
}

export interface MealPlan {
  id?: string;
  date: Date;
  breakfast: Recipe;
  lunch: Recipe;
  dinner: Recipe;
  totalCalories: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
}

export class MealPlanService {
  /**
   * Generate a personalized meal plan using Gemini
   */
  static async generateMealPlan(
    userProfile: UserProfile,
    activeCoachType: string,
    date: Date = new Date()
  ): Promise<MealPlan> {
    try {
      // Calculate daily macros based on user profile
      const dailyMacros = this.calculateDailyMacros(userProfile);
      
      // Build the prompt with user context
      const prompt = this.buildMealPlanPrompt(userProfile, activeCoachType, dailyMacros);
      
      // Generate meal plan using Gemini
      const response = await GeminiChatService.generateResponse(
        prompt, 
        {
          systemPrompt: this.getMealPlanSystemPrompt(),
        },
        {
          maxOutputTokens: 4096,
          temperature: 0.8,
        }
      );
      
      // Parse the JSON response (handle potential markdown formatting)
      const mealPlanData = this.parseJsonResponse(response);
      
      // Save to database
      const savedMealPlan = await this.saveMealPlan(userProfile, mealPlanData, date);
      
      return savedMealPlan;
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error('Failed to generate meal plan');
    }
  }
  
  /**
   * Get existing meal plan for a specific date
   */
  static async getMealPlan(userId: string, date: Date): Promise<MealPlan | null> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          breakfast:recipes!meal_plans_breakfast_recipe_id_fkey(*),
          lunch:recipes!meal_plans_lunch_recipe_id_fkey(*),
          dinner:recipes!meal_plans_dinner_recipe_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('date', dateStr)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      return this.mapDbMealPlanToMealPlan(data);
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      return null;
    }
  }
  
  /**
   * Regenerate a specific meal
   */
  static async regenerateMeal(
    userProfile: UserProfile,
    activeCoachType: string,
    mealType: 'breakfast' | 'lunch' | 'dinner'
  ): Promise<Recipe> {
    try {
      const dailyMacros = this.calculateDailyMacros(userProfile);
      const mealMacros = this.getMealMacros(mealType, dailyMacros);
      
      const prompt = this.buildSingleMealPrompt(userProfile, activeCoachType, mealType, mealMacros);
      
      logger.info('[MealPlanService] Regenerating meal:', mealType);
      logger.debug('[MealPlanService] Prompt length:', prompt.length);
      
      const response = await GeminiChatService.generateResponse(
        prompt,
        {
          systemPrompt: this.getSingleMealSystemPrompt(),
        },
        {
          maxOutputTokens: 2048,
          temperature: 0.9,
        }
      );
      
      const recipeData = this.parseJsonResponse(response);
      
      // Ensure meal_type is set correctly
      recipeData.meal_type = mealType;
      
      // Save the new recipe
      const savedRecipe = await this.saveRecipe(userProfile, recipeData);
      
      return savedRecipe;
    } catch (error: any) {
      console.error('Error regenerating meal:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      });
      
      // Provide more specific error messages
      if (error.message?.includes('non-2xx status') || error.statusCode === 429) {
        throw new Error('Rate limit reached. Please wait a moment before trying again.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Request timed out. Please try again.');
      } else if (error.message?.includes('parse')) {
        throw new Error('Failed to generate a valid recipe. Please try again.');
      }
      
      throw new Error('Failed to regenerate meal. Please try again.');
    }
  }
  
  /**
   * Get user's favorite recipes
   */
  static async getFavoriteRecipes(userId: string, mealType?: string): Promise<Recipe[]> {
    try {
      logger.debug('getFavoriteRecipes called with:', { userId, mealType });
      let query = supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });
      
      if (mealType) {
        query = query.eq('meal_type', mealType);
      }
      
      const { data, error } = await query;
      logger.debug('getFavoriteRecipes query result:', { data: data?.length, error });
      
      if (error) throw error;
      
      return data.map(this.mapDbRecipeToRecipe);
    } catch (error) {
      console.error('Error fetching favorite recipes:', error);
      return [];
    }
  }
  
  /**
   * Toggle favorite status for a recipe
   */
  static async toggleFavorite(recipeId: string, userId: string): Promise<boolean> {
    try {
      // First check if it's already favorited
      const { data: recipe } = await supabase
        .from('recipes')
        .select('is_favorite')
        .eq('id', recipeId)
        .eq('user_id', userId)
        .single();
      
      const newFavoriteStatus = !recipe?.is_favorite;
      
      const { error } = await supabase
        .from('recipes')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', recipeId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return newFavoriteStatus;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private static parseJsonResponse(response: string): any {
    try {
      // First try direct JSON parse
      return JSON.parse(response);
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', innerError);
        }
      }
      
      // Try to find JSON object in the response
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          const jsonStr = response.substring(jsonStart, jsonEnd + 1);
          return JSON.parse(jsonStr);
        } catch (innerError) {
          console.error('Failed to parse substring JSON:', innerError);
        }
      }
      
      console.error('Raw response that failed to parse:', response);
      throw new Error('Failed to parse JSON response from AI');
    }
  }
  
  private static calculateDailyMacros(profile: UserProfile) {
    if (!profile.weight || !profile.goalWeight) {
      return { calories: 2400, protein: 180, fat: 180, carbs: 0 };
    }
    
    const currentWeight = profile.units === 'imperial' 
      ? profile.weight 
      : profile.weight * 2.20462; // Convert kg to lbs
    
    const goalWeight = profile.units === 'imperial'
      ? profile.goalWeight
      : profile.goalWeight * 2.20462;
    
    // Base metabolic rate estimation
    let baseCals = currentWeight * 10;
    
    // Adjust for activity level
    const activityMultiplier = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extra_active': 1.9
    };
    
    baseCals *= activityMultiplier[profile.activityLevel] || 1.55;
    
    // Adjust for weight goal
    if (goalWeight < currentWeight) {
      baseCals *= 0.8; // 20% deficit
    } else if (goalWeight > currentWeight) {
      baseCals *= 1.1; // 10% surplus
    }
    
    // Gender adjustment
    if (profile.gender === 'female') {
      baseCals *= 0.9;
    }
    
    // Calculate macros based on diet type
    const protein = Math.round(currentWeight * 1); // 1g per lb body weight
    const carbs = 0; // Carnivore/keto focused
    const fat = Math.round((baseCals - (protein * 4) - (carbs * 4)) / 9);
    
    return {
      calories: Math.round(baseCals),
      protein,
      fat,
      carbs
    };
  }
  
  private static getMealMacros(mealType: string, dailyMacros: any) {
    const mealDistribution = {
      breakfast: 0.3,
      lunch: 0.35,
      dinner: 0.35
    };
    
    const distribution = mealDistribution[mealType as keyof typeof mealDistribution] || 0.33;
    
    return {
      calories: Math.round(dailyMacros.calories * distribution),
      protein: Math.round(dailyMacros.protein * distribution),
      fat: Math.round(dailyMacros.fat * distribution),
      carbs: Math.round(dailyMacros.carbs * distribution)
    };
  }
  
  private static buildMealPlanPrompt(profile: UserProfile, coachType: string, dailyMacros: any): string {
    const cookingMethods = profile.cookingMethods?.join(', ') || 'any';
    const favoriteFoods = profile.favoriteFoods || 'any foods';
    const dislikedFoods = profile.dislikedFoods || 'none';
    const allergies = profile.allergies || 'none';
    const restrictions = profile.dietaryRestrictions || 'none';
    const dietaryPreferences = profile.dietaryPreferences?.join(', ') || 'none specified';
    const healthGoals = profile.healthGoals?.join(', ') || 'general health';
    const healthConditions = profile.healthConditions?.join(', ') || 'none';
    
    // Calculate current and goal weight in the user's preferred units
    const currentWeight = profile.units === 'imperial' 
      ? `${profile.weight} lbs` 
      : `${profile.weight} kg`;
    const goalWeight = profile.units === 'imperial'
      ? `${profile.goalWeight} lbs`
      : `${profile.goalWeight} kg`;
    
    // Calculate height in user's preferred units
    const height = profile.height
      ? (profile.units === 'imperial'
        ? `${Math.floor(profile.height / 12)} ft ${profile.height % 12} in`
        : `${profile.height} cm`)
      : 'not provided';
    
    return `Generate a complete daily meal plan for a person with the following profile:

Personal Information:
- Age: ${profile.age || 'Not specified'} years old
- Gender: ${profile.gender || 'Not specified'}
- Height: ${height}
- Current Weight: ${currentWeight}
- Goal Weight: ${goalWeight}
- Activity Level: ${profile.activityLevel || 'moderately_active'}

Diet Information:
- Coach Type: ${coachType} (AI coach helping with this diet approach)
- Current Diet Type: ${profile.dietType || 'not specified'} (user's actual diet)
- Dietary Preferences: ${dietaryPreferences}
- Health Goals: ${healthGoals}
- Health Conditions: ${healthConditions}

Daily Macros (calculated based on goals):
- Daily Calories: ${dailyMacros.calories}
- Daily Protein: ${dailyMacros.protein}g
- Daily Fat: ${dailyMacros.fat}g
- Daily Carbs: ${dailyMacros.carbs}g

Food Preferences:
- Available Cooking Methods: ${cookingMethods}
- Favorite Foods: ${favoriteFoods}
- Disliked Foods: ${dislikedFoods}
- Allergies: ${allergies}
- Dietary Restrictions: ${restrictions}

Create a meal plan with breakfast (30%), lunch (35%), and dinner (35%) of daily macros.
Consider the user's current diet (${profile.dietType || 'not specified'}) while following ${coachType} coach principles.
For example, if user is on keto diet with a carnivore coach, create keto-friendly meals that lean towards carnivore.
Ensure variety and practical recipes that match the user's cooking methods.`;
  }
  
  private static buildSingleMealPrompt(
    profile: UserProfile, 
    coachType: string, 
    mealType: string, 
    mealMacros: any
  ): string {
    const cookingMethods = profile.cookingMethods?.join(', ') || 'any';
    const dietaryPreferences = profile.dietaryPreferences?.join(', ') || 'none specified';
    const healthGoals = profile.healthGoals?.join(', ') || 'general health';
    
    return `Generate a single ${mealType} recipe for a person with the following profile:

Diet Context:
- Coach Type: ${coachType} (AI coach guiding diet)
- Current Diet: ${profile.dietType || 'not specified'} (user's actual diet)
- Dietary Preferences: ${dietaryPreferences}
- Health Goals: ${healthGoals}

Target Macros for this ${mealType}:
- Calories: ${mealMacros.calories}
- Protein: ${mealMacros.protein}g
- Fat: ${mealMacros.fat}g
- Carbs: ${mealMacros.carbs}g

User Preferences:
- Cooking Methods: ${cookingMethods}
- Favorite Foods: ${profile.favoriteFoods || 'any'}
- Avoid: ${profile.dislikedFoods || 'none'}
- Allergies: ${profile.allergies || 'none'}
- Dietary Restrictions: ${profile.dietaryRestrictions || 'none'}

Create a practical, delicious ${mealType} recipe that respects both the coach guidance (${coachType}) and user's current diet (${profile.dietType || 'flexible'}).`;
  }
  
  private static getMealPlanSystemPrompt(): string {
    return `You are a meal planning AI. Generate meal plans in valid JSON format.

CRITICAL: Return ONLY pure JSON. Do not include any markdown formatting, code blocks, or explanatory text.
Do not wrap the JSON in backticks or any other characters.

Return a JSON object with exactly this structure:
{
  "breakfast": {
    "name": "Recipe Name",
    "description": "Brief description",
    "calories": 500,
    "protein_g": 40,
    "fat_g": 35,
    "carbs_g": 0,
    "cooking_method": "stovetop",
    "prep_time_minutes": 10,
    "cook_time_minutes": 15,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "tags": ["high-protein", "quick"]
  },
  "lunch": { ... same structure ... },
  "dinner": { ... same structure ... }
}

Ensure all recipes are practical and follow the specified diet type.
Start your response with { and end with }`;
  }
  
  private static getSingleMealSystemPrompt(): string {
    return `You are a recipe generation AI. Generate recipes in valid JSON format.

CRITICAL: Return ONLY pure JSON. Do not include any markdown formatting, code blocks, or explanatory text.
Do not wrap the JSON in backticks or any other characters.

Return a JSON object with exactly this structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "meal_type": "breakfast|lunch|dinner",
  "calories": 500,
  "protein_g": 40,
  "fat_g": 35,
  "carbs_g": 0,
  "cooking_method": "stovetop",
  "prep_time_minutes": 10,
  "cook_time_minutes": 15,
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "tags": ["high-protein", "quick"]
}

Start your response with { and end with }`;
  }
  
  // Database mapping methods
  
  private static async saveMealPlan(profile: any, mealPlanData: any, date: Date): Promise<MealPlan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Save recipes first
    const breakfast = await this.saveRecipe(profile, { ...mealPlanData.breakfast, meal_type: 'breakfast' });
    const lunch = await this.saveRecipe(profile, { ...mealPlanData.lunch, meal_type: 'lunch' });
    const dinner = await this.saveRecipe(profile, { ...mealPlanData.dinner, meal_type: 'dinner' });
    
    // Calculate totals
    const totalCalories = breakfast.calories + lunch.calories + dinner.calories;
    const totalProteinG = breakfast.proteinG + lunch.proteinG + dinner.proteinG;
    const totalFatG = breakfast.fatG + lunch.fatG + dinner.fatG;
    const totalCarbsG = breakfast.carbsG + lunch.carbsG + dinner.carbsG;
    
    // Save meal plan
    const { data, error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        date: date.toISOString().split('T')[0],
        breakfast_recipe_id: breakfast.id,
        lunch_recipe_id: lunch.id,
        dinner_recipe_id: dinner.id,
        total_calories: totalCalories,
        total_protein_g: totalProteinG,
        total_fat_g: totalFatG,
        total_carbs_g: totalCarbsG,
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      date,
      breakfast,
      lunch,
      dinner,
      totalCalories,
      totalProteinG,
      totalFatG,
      totalCarbsG,
    };
  }
  
  private static async saveRecipe(profile: any, recipeData: any): Promise<Recipe> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Validate recipe data
    if (!recipeData.name || !recipeData.meal_type) {
      console.error('Invalid recipe data:', recipeData);
      throw new Error('Recipe must have a name and meal type');
    }
    
    // Ensure numeric values
    const recipeToSave = {
      user_id: user.id,
      name: recipeData.name,
      description: recipeData.description || '',
      meal_type: recipeData.meal_type,
      calories: parseInt(recipeData.calories) || 0,
      protein_g: parseFloat(recipeData.protein_g) || 0,
      fat_g: parseFloat(recipeData.fat_g) || 0,
      carbs_g: parseFloat(recipeData.carbs_g) || 0,
      cooking_method: recipeData.cooking_method || 'not specified',
      prep_time_minutes: parseInt(recipeData.prep_time_minutes) || 0,
      cook_time_minutes: parseInt(recipeData.cook_time_minutes) || 0,
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
      instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
      tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
    };
    
    logger.info('[MealPlanService] Saving recipe:', recipeToSave.name);
    
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipeToSave)
      .select()
      .single();
    
    if (error) {
      console.error('Database error saving recipe:', error);
      throw error;
    }
    
    return this.mapDbRecipeToRecipe(data);
  }
  
  private static mapDbRecipeToRecipe(dbRecipe: any): Recipe {
    return {
      id: dbRecipe.id,
      name: dbRecipe.name,
      description: dbRecipe.description,
      mealType: dbRecipe.meal_type,
      calories: dbRecipe.calories,
      proteinG: dbRecipe.protein_g,
      fatG: dbRecipe.fat_g,
      carbsG: dbRecipe.carbs_g,
      cookingMethod: dbRecipe.cooking_method,
      prepTimeMinutes: dbRecipe.prep_time_minutes,
      cookTimeMinutes: dbRecipe.cook_time_minutes,
      ingredients: dbRecipe.ingredients,
      instructions: dbRecipe.instructions,
      tags: dbRecipe.tags,
      isFavorite: dbRecipe.is_favorite,
    };
  }
  
  private static mapDbMealPlanToMealPlan(dbMealPlan: any): MealPlan {
    return {
      id: dbMealPlan.id,
      date: new Date(dbMealPlan.date),
      breakfast: this.mapDbRecipeToRecipe(dbMealPlan.breakfast),
      lunch: this.mapDbRecipeToRecipe(dbMealPlan.lunch),
      dinner: this.mapDbRecipeToRecipe(dbMealPlan.dinner),
      totalCalories: dbMealPlan.total_calories,
      totalProteinG: dbMealPlan.total_protein_g,
      totalFatG: dbMealPlan.total_fat_g,
      totalCarbsG: dbMealPlan.total_carbs_g,
    };
  }
}