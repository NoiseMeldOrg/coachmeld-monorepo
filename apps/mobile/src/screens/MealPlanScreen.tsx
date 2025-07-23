import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useCoach } from '../context/CoachContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { ExportService } from '../services/exportService';
import { MealPlanService, MealPlan, Recipe } from '../services/mealPlanService';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { CoachSelectorPanel } from '../components/CoachSelectorPanel';
import { FavoriteRecipesModal } from '../components/FavoriteRecipesModal';
import { getCoachDisplayName } from '../utils/coachDisplay';
import { supabase } from '../lib/supabase';

export const MealPlanScreen: React.FC = () => {
  const { theme } = useTheme();
  const { userProfile } = useUser();
  const { activeCoach, coaches, switchCoach } = useCoach();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingMeal, setGeneratingMeal] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [showCoachSelector, setShowCoachSelector] = useState(false);
  const [selectedCoachForMealPlan, setSelectedCoachForMealPlan] = useState(activeCoach);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favoritesModalMealType, setFavoritesModalMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  
  // Force layout recalculation on mount to prevent viewState errors
  useEffect(() => {
    // Small delay to ensure proper mounting
    const timer = setTimeout(() => {}, 0);
    return () => clearTimeout(timer);
  }, []);
  
  // Update selected coach when active coach changes
  useEffect(() => {
    setSelectedCoachForMealPlan(activeCoach);
  }, [activeCoach]);

  // Load meal plan on mount or when selected coach changes
  useEffect(() => {
    if (user && userProfile && selectedCoachForMealPlan) {
      loadMealPlan();
    }
  }, [user, userProfile, selectedCoachForMealPlan]);

  // Set up real-time subscription for meal plan updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to meal plan updates
    const mealPlanSubscription = supabase
      .channel('meal_plan_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Meal plan update received:', payload);
          // Reload meal plan when changes are detected
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            loadMealPlan();
          }
        }
      )
      .subscribe();

    // Subscribe to recipe updates (for favorites changes)
    const recipeSubscription = supabase
      .channel('recipe_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recipes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Recipe update received:', payload);
          // Update the recipe in the meal plan if it's currently displayed
          if (mealPlan && payload.new) {
            const updatedRecipe = payload.new;
            const updatedPlan = { ...mealPlan };
            let updated = false;

            if (updatedPlan.breakfast.id === updatedRecipe.id) {
              updatedPlan.breakfast = { ...updatedPlan.breakfast, isFavorite: updatedRecipe.is_favorite };
              updated = true;
            } else if (updatedPlan.lunch.id === updatedRecipe.id) {
              updatedPlan.lunch = { ...updatedPlan.lunch, isFavorite: updatedRecipe.is_favorite };
              updated = true;
            } else if (updatedPlan.dinner.id === updatedRecipe.id) {
              updatedPlan.dinner = { ...updatedPlan.dinner, isFavorite: updatedRecipe.is_favorite };
              updated = true;
            }

            if (updated) {
              setMealPlan(updatedPlan);
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      mealPlanSubscription.unsubscribe();
      recipeSubscription.unsubscribe();
    };
  }, [user, mealPlan]);

  // Calculate daily calories based on goal
  const calculateDailyCalories = () => {
    if (!userProfile || !userProfile.weight || !userProfile.goalWeight) {
      return { calories: 2400, protein: 180, fat: 180 };
    }

    const currentWeight = userProfile.units === 'imperial' 
      ? userProfile.weight 
      : userProfile.weight * 2.20462; // Convert kg to lbs
    
    const goalWeight = userProfile.units === 'imperial'
      ? userProfile.goalWeight
      : userProfile.goalWeight * 2.20462;

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
    
    baseCals *= activityMultiplier[userProfile.activityLevel] || 1.55;

    // Adjust for weight goal
    if (goalWeight < currentWeight) {
      // Weight loss: create deficit
      baseCals *= 0.8; // 20% deficit
    } else if (goalWeight > currentWeight) {
      // Weight gain: create surplus
      baseCals *= 1.1; // 10% surplus
    }

    // Gender adjustment
    if (userProfile.gender === 'female') {
      baseCals *= 0.9;
    }

    // Calculate macros for carnivore diet (high protein, high fat)
    const protein = Math.round(currentWeight * 1); // 1g per lb body weight
    const fat = Math.round((baseCals - (protein * 4)) / 9); // Rest from fat

    return {
      calories: Math.round(baseCals),
      protein: protein,
      fat: fat
    };
  };

  const { calories, protein, fat } = calculateDailyCalories();
  
  const loadMealPlan = async () => {
    if (!user || !userProfile) return;
    
    try {
      setLoading(true);
      
      // Try to get existing meal plan for today
      const existingPlan = await MealPlanService.getMealPlan(user.id, new Date());
      
      if (existingPlan) {
        setMealPlan(existingPlan);
      } else if (userProfile.weight && userProfile.goalWeight) {
        // Generate new meal plan if none exists and profile is complete
        const newPlan = await MealPlanService.generateMealPlan(
          userProfile,
          selectedCoachForMealPlan?.coachType || activeCoach?.coachType || 'carnivore',
          new Date()
        );
        setMealPlan(newPlan);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
      Alert.alert('Error', 'Failed to load meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const regenerateMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!userProfile || !mealPlan) return;
    
    // Prevent rapid regeneration
    if (generatingMeal) {
      Alert.alert('Please wait', 'Already generating a recipe. Please wait for it to complete.');
      return;
    }
    
    try {
      setGeneratingMeal(mealType);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newRecipe = await MealPlanService.regenerateMeal(
        userProfile,
        selectedCoachForMealPlan?.coachType || activeCoach?.coachType || 'carnivore',
        mealType
      );
      
      // Update the meal plan with new recipe
      const updatedPlan = { ...mealPlan };
      updatedPlan[mealType] = newRecipe;
      
      // Recalculate totals
      updatedPlan.totalCalories = updatedPlan.breakfast.calories + updatedPlan.lunch.calories + updatedPlan.dinner.calories;
      updatedPlan.totalProteinG = updatedPlan.breakfast.proteinG + updatedPlan.lunch.proteinG + updatedPlan.dinner.proteinG;
      updatedPlan.totalFatG = updatedPlan.breakfast.fatG + updatedPlan.lunch.fatG + updatedPlan.dinner.fatG;
      updatedPlan.totalCarbsG = updatedPlan.breakfast.carbsG + updatedPlan.lunch.carbsG + updatedPlan.dinner.carbsG;
      
      setMealPlan(updatedPlan);
    } catch (error: any) {
      console.error('Error regenerating meal:', error);
      const errorMessage = error.message || 'Failed to generate new recipe. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setGeneratingMeal(null);
    }
  };
  
  const handleSelectFavoriteRecipe = (recipe: Recipe, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!mealPlan) return;
    
    // Update the meal plan with the selected favorite recipe
    const updatedPlan = { ...mealPlan };
    updatedPlan[mealType] = recipe;
    
    // Recalculate totals
    updatedPlan.totalCalories = updatedPlan.breakfast.calories + updatedPlan.lunch.calories + updatedPlan.dinner.calories;
    updatedPlan.totalProteinG = updatedPlan.breakfast.proteinG + updatedPlan.lunch.proteinG + updatedPlan.dinner.proteinG;
    updatedPlan.totalFatG = updatedPlan.breakfast.fatG + updatedPlan.lunch.fatG + updatedPlan.dinner.fatG;
    updatedPlan.totalCarbsG = updatedPlan.breakfast.carbsG + updatedPlan.lunch.carbsG + updatedPlan.dinner.carbsG;
    
    setMealPlan(updatedPlan);
  };
  
  // Meal data structure for export
  const mealData = [
    {
      meal: 'Breakfast',
      time: '8:00 AM',
      foods: [
        '4 eggs scrambled in butter',
        '4 strips of bacon',
        'Black coffee'
      ]
    },
    {
      meal: 'Lunch',
      time: '12:30 PM',
      foods: [
        '10 oz ribeye steak',
        '2 tbsp butter',
        'Bone broth'
      ]
    },
    {
      meal: 'Dinner',
      time: '6:00 PM',
      foods: [
        '8 oz ground beef patties',
        '2 oz cheddar cheese',
        '1 tbsp tallow'
      ]
    }
  ];
  
  const exportMealPlan = async () => {
    Alert.alert(
      'Export Meal Plan',
      'Choose export format:',
      [
        {
          text: 'Text',
          onPress: async () => {
            try {
              const text = await generateMealPlanText();
              await Share.share({
                message: text,
                title: 'CoachMeld Meal Plan',
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to export meal plan');
            }
          }
        },
        {
          text: 'HTML File',
          onPress: async () => {
            try {
              const html = await generateMealPlanHTML();
              const filename = `CoachMeld_MealPlan_${new Date().toISOString().split('T')[0]}.html`;
              await ExportService.saveAndShare(html, filename, 'text/html');
            } catch (error) {
              Alert.alert('Error', 'Failed to export meal plan');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };
  
  const generateMealPlanText = async () => {
    let text = `CoachMeld Meal Plan\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    if (userProfile?.name) {
      text += `User: ${userProfile.name}\n`;
    }
    text += `\nDaily Macros:\n`;
    text += `Calories: ${calories.toLocaleString()}\n`;
    text += `Protein: ${protein}g\n`;
    text += `Fat: ${fat}g\n`;
    text += `\n${'='.repeat(40)}\n\n`;
    
    mealData.forEach(meal => {
      text += `${meal.meal} (${meal.time})\n`;
      meal.foods.forEach(food => {
        text += `  • ${food}\n`;
      });
      text += '\n';
    });
    
    text += `\nCarnivore Tips:\n`;
    text += `• Eat fatty cuts of meat to maintain energy\n`;
    text += `• Salt your food to taste\n`;
    text += `• Stay hydrated with water and electrolytes\n`;
    
    return text;
  };
  
  const generateMealPlanHTML = async () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoachMeld Meal Plan</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #eee;
    }
    .header h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .date {
      color: #666;
      font-size: 16px;
    }
    .macros {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
    }
    .macro-item {
      text-align: center;
    }
    .macro-value {
      font-size: 28px;
      font-weight: bold;
      color: #007AFF;
    }
    .macro-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .meal {
      margin-bottom: 25px;
      padding: 20px;
      border: 1px solid #eee;
      border-radius: 8px;
    }
    .meal-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .meal-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    .meal-time {
      color: #666;
    }
    .food-item {
      padding: 5px 0;
      padding-left: 20px;
    }
    .tips {
      margin-top: 30px;
      padding: 20px;
      background-color: #fff3cd;
      border-radius: 8px;
    }
    .tips h3 {
      color: #856404;
      margin-bottom: 10px;
    }
    .tips li {
      color: #856404;
      margin-bottom: 5px;
    }
    @media print {
      body { background-color: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CoachMeld Meal Plan</h1>
      <div class="date">${new Date().toLocaleDateString()}</div>
      ${userProfile?.name ? `<div style="margin-top: 10px; color: #666;">Prepared for: ${userProfile.name}</div>` : ''}
    </div>
    
    <div class="macros">
      <div class="macro-item">
        <div class="macro-value">${calories.toLocaleString()}</div>
        <div class="macro-label">Calories</div>
      </div>
      <div class="macro-item">
        <div class="macro-value">${protein}g</div>
        <div class="macro-label">Protein</div>
      </div>
      <div class="macro-item">
        <div class="macro-value">${fat}g</div>
        <div class="macro-label">Fat</div>
      </div>
    </div>
    
    ${mealData.map(meal => `
      <div class="meal">
        <div class="meal-header">
          <div class="meal-title">${meal.meal}</div>
          <div class="meal-time">${meal.time}</div>
        </div>
        ${meal.foods.map(food => `
          <div class="food-item">• ${food}</div>
        `).join('')}
      </div>
    `).join('')}
    
    <div class="tips">
      <h3>Carnivore Tips</h3>
      <ul>
        <li>Eat fatty cuts of meat to maintain energy</li>
        <li>Salt your food to taste</li>
        <li>Stay hydrated with water and electrolytes</li>
      </ul>
    </div>
  </div>
</body>
</html>`;
  };

  const MealCard = ({ 
    recipe, 
    mealType,
    isGenerating 
  }: { 
    recipe: Recipe; 
    mealType: 'breakfast' | 'lunch' | 'dinner';
    isGenerating: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.mealCard, { backgroundColor: theme.surface }]}
      activeOpacity={0.95}
      onPress={() => {
        setSelectedRecipe(recipe);
        setShowRecipeDetail(true);
      }}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealInfo}>
          <Text style={[styles.mealTitle, { color: theme.text }]}>{recipe.name}</Text>
          <Text style={[styles.mealDescription, { color: theme.textSecondary }]}>
            {recipe.description}
          </Text>
        </View>
        <View style={styles.caloriesContainer}>
          <Text style={[styles.caloriesText, { color: theme.text }]}>{recipe.calories}</Text>
          <Text style={[styles.caloriesLabel, { color: theme.textSecondary }]}>cal</Text>
        </View>
      </View>
      
      <View style={styles.mealMacros}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: theme.text }]}>{recipe.proteinG}g</Text>
          <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Protein</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: theme.text }]}>{recipe.fatG}g</Text>
          <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Fat</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: theme.text }]}>{recipe.carbsG}g</Text>
          <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Carbs</Text>
        </View>
      </View>

      {recipe.cookingMethod && (
        <View style={styles.cookingMethod}>
          <Ionicons name="flame-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.cookingMethodText, { color: theme.textSecondary }]}>
            {recipe.cookingMethod}
          </Text>
        </View>
      )}
      
      <View style={styles.mealActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.primary + '15' }]}
          onPress={() => regenerateMeal(mealType)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.primary }]}>New Recipe</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.secondary + '15' }]}
          onPress={() => {
            setFavoritesModalMealType(mealType);
            setShowFavoritesModal(true);
          }}
        >
          <Ionicons name="heart-outline" size={16} color={theme.secondary} />
          <Text style={[styles.actionText, { color: theme.secondary }]}>From Favorites</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!userProfile?.weight || !userProfile?.goalWeight ? (
          <View style={[styles.setupCard, { backgroundColor: theme.warning + '20' }]}>
            <Ionicons name="alert-circle" size={24} color={theme.warning} />
            <Text style={[styles.setupText, { color: theme.text }]}>
              Please complete your profile with current and goal weight to get personalized meal plans
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Generating your personalized meal plan...
            </Text>
          </View>
        ) : null}

        {/* Coach Selector */}
        {selectedCoachForMealPlan && coaches.length > 0 && (
          <TouchableOpacity
            style={[styles.coachSelector, { backgroundColor: theme.surface }]}
            onPress={() => setShowCoachSelector(true)}
            activeOpacity={0.7}
          >
            <View style={styles.coachSelectorLeft}>
              <View style={[styles.coachIcon, { backgroundColor: selectedCoachForMealPlan.colorTheme.primary + '20' }]}>
                {selectedCoachForMealPlan.iconLibrary === 'MaterialCommunityIcons' ? (
                  <MaterialCommunityIcons
                    name={selectedCoachForMealPlan.iconName as any}
                    size={20}
                    color={selectedCoachForMealPlan.colorTheme.primary}
                    style={selectedCoachForMealPlan.iconRotation ? { transform: [{ rotate: `${selectedCoachForMealPlan.iconRotation}deg` }] } : {}}
                  />
                ) : (
                  <Ionicons
                    name={selectedCoachForMealPlan.iconName as any}
                    size={20}
                    color={selectedCoachForMealPlan.colorTheme.primary}
                  />
                )}
              </View>
              <View style={styles.coachInfo}>
                <Text style={[styles.coachSelectorLabel, { color: theme.textSecondary }]}>
                  Meal plan by
                </Text>
                <Text style={[styles.coachSelectorName, { color: theme.text }]}>
                  {getCoachDisplayName(selectedCoachForMealPlan)}
                </Text>
              </View>
            </View>
            {coaches.length > 1 && (
              <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {/* Daily Overview */}
        {mealPlan && !loading && (
          <View style={styles.overviewSection}>
            <View style={styles.headerRow}>
              <Text style={[styles.dateText, { color: theme.text }]}>
                Today's Plan {userProfile?.goalWeight && userProfile?.weight && userProfile.goalWeight !== userProfile.weight ? 
                  `(${userProfile.goalWeight < userProfile.weight ? 'Cut' : 'Bulk'})` : ''}
              </Text>
              <TouchableOpacity onPress={exportMealPlan} style={styles.exportButton}>
                <Ionicons name="share-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>
                  {mealPlan.totalCalories.toLocaleString()}
                </Text>
                <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{mealPlan.totalProteinG}g</Text>
                <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{mealPlan.totalFatG}g</Text>
                <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Meal Plans */}
        {mealPlan && !loading && (
          <>
            <MealCard 
              recipe={mealPlan.breakfast}
              mealType="breakfast"
              isGenerating={generatingMeal === 'breakfast'}
            />
            <MealCard 
              recipe={mealPlan.lunch}
              mealType="lunch"
              isGenerating={generatingMeal === 'lunch'}
            />
            <MealCard 
              recipe={mealPlan.dinner}
              mealType="dinner"
              isGenerating={generatingMeal === 'dinner'}
            />
          </>
        )}

        {/* Add Meal Button */}
        <TouchableOpacity 
          style={[styles.addMealButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
          <Text style={styles.addMealText}>Add Meal</Text>
        </TouchableOpacity>

        {/* Tips Section */}
        <View style={[styles.tipsSection, { backgroundColor: theme.surface }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={24} color={theme.warning} />
            <Text style={[styles.tipsTitle, { color: theme.text }]}>Carnivore Tips</Text>
          </View>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            • Eat fatty cuts of meat to maintain energy
          </Text>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            • Salt your food to taste
          </Text>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            • Stay hydrated with water and electrolytes
          </Text>
        </View>
      </ScrollView>
      
      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        visible={showRecipeDetail}
        recipe={selectedRecipe}
        onClose={() => {
          setShowRecipeDetail(false);
          setSelectedRecipe(null);
        }}
        onToggleFavorite={async () => {
          if (selectedRecipe && user) {
            try {
              const newFavoriteStatus = await MealPlanService.toggleFavorite(
                selectedRecipe.id!,
                user.id
              );
              // Update the recipe in the meal plan
              if (mealPlan) {
                const updatedPlan = { ...mealPlan };
                if (updatedPlan.breakfast.id === selectedRecipe.id) {
                  updatedPlan.breakfast = { ...selectedRecipe, isFavorite: newFavoriteStatus };
                } else if (updatedPlan.lunch.id === selectedRecipe.id) {
                  updatedPlan.lunch = { ...selectedRecipe, isFavorite: newFavoriteStatus };
                } else if (updatedPlan.dinner.id === selectedRecipe.id) {
                  updatedPlan.dinner = { ...selectedRecipe, isFavorite: newFavoriteStatus };
                }
                setMealPlan(updatedPlan);
                setSelectedRecipe({ ...selectedRecipe, isFavorite: newFavoriteStatus });
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update favorite status');
            }
          }
        }}
        isFavorite={selectedRecipe?.isFavorite}
      />
      
      {/* Coach Selector Panel */}
      <CoachSelectorPanel
        visible={showCoachSelector}
        onClose={() => setShowCoachSelector(false)}
        coaches={coaches}
        activeCoach={selectedCoachForMealPlan}
        onSelectCoach={(coach) => {
          setSelectedCoachForMealPlan(coach);
          setShowCoachSelector(false);
          // Clear existing meal plan to force regeneration with new coach
          setMealPlan(null);
        }}
        hasActiveSubscription={hasActiveSubscription}
      />
      
      {/* Favorite Recipes Modal */}
      <FavoriteRecipesModal
        visible={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        mealType={favoritesModalMealType}
        onSelectRecipe={(recipe) => handleSelectFavoriteRecipe(recipe, favoritesModalMealType)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  coachSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  coachSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  coachInfo: {
    flex: 1,
  },
  coachSelectorLabel: {
    fontSize: 12,
  },
  coachSelectorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  overviewSection: {
    marginBottom: 24,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportButton: {
    padding: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  mealCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mealInfo: {
    flex: 1,
    paddingRight: 10,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  caloriesContainer: {
    alignItems: 'center',
  },
  caloriesText: {
    fontSize: 20,
    fontWeight: '600',
  },
  caloriesLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  mealMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  cookingMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cookingMethodText: {
    fontSize: 14,
    marginLeft: 6,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  addMealText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsSection: {
    padding: 16,
    borderRadius: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  setupText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});