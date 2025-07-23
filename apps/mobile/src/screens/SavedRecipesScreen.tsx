import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Recipe, MealPlanService } from '../services/mealPlanService';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { useNavigation } from '@react-navigation/native';

export const SavedRecipesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  useEffect(() => {
    filterRecipes();
  }, [recipes, searchQuery, selectedFilter]);

  const loadRecipes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Get all favorite recipes (no meal type filter)
      const favoriteRecipes = await MealPlanService.getFavoriteRecipes(user.id);
      setRecipes(favoriteRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load saved recipes');
    } finally {
      setLoading(false);
    }
  };

  const filterRecipes = () => {
    let filtered = recipes;

    // Filter by meal type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(recipe => recipe.mealType === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => ing.toLowerCase().includes(query)) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredRecipes(filtered);
  };

  const handleToggleFavorite = async (recipe: Recipe) => {
    if (!user || !recipe.id) return;

    try {
      await MealPlanService.toggleFavorite(recipe.id, user.id);
      // Remove the recipe from the list since it's no longer a favorite
      setRecipes(recipes.filter(r => r.id !== recipe.id));
      if (selectedRecipe?.id === recipe.id) {
        setShowRecipeDetail(false);
        setSelectedRecipe(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const FilterButton = ({ 
    label, 
    value 
  }: { 
    label: string; 
    value: 'all' | 'breakfast' | 'lunch' | 'dinner' 
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === value && styles.filterButtonActive,
        { 
          backgroundColor: selectedFilter === value ? theme.primary : theme.surface,
          borderColor: theme.border,
        }
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: selectedFilter === value ? '#ffffff' : theme.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <TouchableOpacity
      style={[styles.recipeCard, { backgroundColor: theme.surface }]}
      onPress={() => {
        setSelectedRecipe(recipe);
        setShowRecipeDetail(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.recipeHeader}>
        <View style={styles.recipeInfo}>
          <View style={styles.recipeTitleRow}>
            <Text style={[styles.recipeName, { color: theme.text }]}>{recipe.name}</Text>
            <View style={[styles.mealTypeBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.mealTypeText, { color: theme.primary }]}>
                {recipe.mealType.charAt(0).toUpperCase() + recipe.mealType.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.recipeDescription, { color: theme.textSecondary }]}>
            {recipe.description}
          </Text>
        </View>
      </View>
      
      <View style={styles.macrosRow}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: theme.primary }]}>{recipe.calories}</Text>
          <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>cal</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: theme.text }]}>{recipe.proteinG}g</Text>
          <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>protein</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: theme.text }]}>{recipe.fatG}g</Text>
          <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>fat</Text>
        </View>
        <View style={styles.macroItem}>
          <Ionicons name="heart" size={20} color={theme.secondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Saved Recipes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search recipes..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <FilterButton label="All" value="all" />
        <FilterButton label="Breakfast" value="breakfast" />
        <FilterButton label="Lunch" value="lunch" />
        <FilterButton label="Dinner" value="dinner" />
      </ScrollView>

      {/* Recipes List */}
      <ScrollView style={styles.recipesList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading saved recipes...
            </Text>
          </View>
        ) : filteredRecipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'No recipes found matching your criteria' 
                : 'No saved recipes yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Favorite recipes from your meal plans to see them here'}
            </Text>
          </View>
        ) : (
          <View style={styles.recipesGrid}>
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        visible={showRecipeDetail}
        recipe={selectedRecipe}
        onClose={() => {
          setShowRecipeDetail(false);
          setSelectedRecipe(null);
        }}
        onToggleFavorite={() => {
          if (selectedRecipe) {
            handleToggleFavorite(selectedRecipe);
          }
        }}
        isFavorite={true} // All recipes in this screen are favorites
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonActive: {
    borderWidth: 0,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recipesList: {
    flex: 1,
  },
  recipesGrid: {
    padding: 16,
  },
  recipeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recipeHeader: {
    marginBottom: 12,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  mealTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recipeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  macroLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});