# TODO: Meal Planning Feature - Remaining Implementation

## Current Status
The dynamic meal planning system is mostly complete with the following implemented:
- ✅ Database schema (recipes, meal_plans, favorite_recipes tables)
- ✅ Cooking preferences in user profile
- ✅ AI-powered meal generation with Gemini
- ✅ Dynamic meal plan screen with loading states
- ✅ "New Recipe" button to regenerate individual meals
- ✅ Recipe detail modal to view ingredients/instructions
- ✅ Basic favorite toggle functionality
- ✅ Comprehensive user profile data passed to AI (diet type, coach type, health conditions, etc.)

## Still To Implement

### 1. "From Favorites" Functionality
- Create a favorites selection modal
- Filter favorites by meal type (breakfast/lunch/dinner)
- Allow user to select a favorite recipe to replace current meal
- Update meal plan with selected favorite
- Recalculate daily totals

### 2. Coach Selector on Meal Plan Screen
- Add coach selector dropdown/pills at top of meal plan screen
- Allow switching between user's available coaches
- Regenerate meal plan when coach changes
- Pass selected coach context to Gemini

### 3. Recipe Saving & Management
- Add "Save Recipe" button in recipe detail modal
- Create saved recipes screen (accessible from settings or meals tab)
- Allow editing saved recipes
- Add search/filter for saved recipes
- Implement delete functionality

### 4. Real-time Updates (Supabase Subscriptions)
- Subscribe to meal_plans table changes
- Refresh UI when meal plan updates
- Handle multi-device sync
- Update when user profile changes affect macros

### 5. Chat with Coach About Recipe
- Implement "Chat with Coach" button in recipe detail
- Navigate to chat with recipe context
- Pre-populate chat with recipe discussion prompt
- Allow customization requests

### 6. Additional Enhancements
- Add snacks support (currently only 3 meals)
- Weekly meal planning view
- Shopping list generation from meal plans
- Meal prep instructions
- Recipe scaling based on servings
- Print-friendly recipe cards
- Nutrition tracking integration

## Known Issues to Fix
- Handle edge function rate limiting better
- Add retry logic for failed meal generation
- Improve error messages for specific failures
- Add offline support for saved recipes

## Database Considerations
- Migration 053 already run successfully
- All tables created and ready
- Consider adding meal_plan_templates table for preset plans
- May need recipe_versions table for edit history

## Files to Modify/Create
1. `src/components/FavoriteRecipesModal.tsx` - New component
2. `src/screens/SavedRecipesScreen.tsx` - New screen
3. `src/screens/MealPlanScreen.tsx` - Add coach selector
4. `src/services/mealPlanService.ts` - Add favorites selection logic
5. `src/navigation/MainNavigator.tsx` - Add saved recipes route

## Testing Checklist
- [ ] Test with different coaches selected
- [ ] Verify favorites persist across sessions
- [ ] Test meal plan regeneration with poor network
- [ ] Verify subscription updates work
- [ ] Test with multiple devices
- [ ] Check performance with many saved recipes