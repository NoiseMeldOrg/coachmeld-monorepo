import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Recipe } from '../services/mealPlanService';
import { MealPlanService } from '../services/mealPlanService';
import { useAuth } from '../context/AuthContext';

interface FavoriteRecipesModalProps {
  visible: boolean;
  onClose: () => void;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  onSelectRecipe: (recipe: Recipe) => void;
}

export const FavoriteRecipesModal: React.FC<FavoriteRecipesModalProps> = ({
  visible,
  onClose,
  mealType,
  onSelectRecipe,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && user) {
      loadFavorites();
    }
  }, [visible, user, mealType]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const favoriteRecipes = await MealPlanService.getFavoriteRecipes(user.id, mealType);
      setFavorites(favoriteRecipes);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    onSelectRecipe(recipe);
    onClose();
  };

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
    return (
      <TouchableOpacity
        style={[
          styles.recipeCard, 
          { backgroundColor: theme.surface }
        ]}
        onPress={() => handleSelectRecipe(recipe)}
        activeOpacity={0.7}
      >
        <View style={styles.recipeHeader}>
          <View style={styles.recipeInfo}>
            <Text style={[styles.recipeName, { color: theme.text }]}>
              {recipe.name}
            </Text>
            <Text style={[styles.recipeDescription, { color: theme.textSecondary }]}>
              {recipe.description}
            </Text>
          </View>
          <View style={styles.caloriesContainer}>
            <Text style={[styles.caloriesText, { color: theme.text }]}>
              {recipe.calories}
            </Text>
            <Text style={[styles.caloriesLabel, { color: theme.textSecondary }]}>
              cal
            </Text>
          </View>
        </View>
        
        <View style={styles.macrosRow}>
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
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <SafeAreaView style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              Favorite {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Recipes
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading favorites...
                </Text>
              </View>
            ) : favorites.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No favorite {mealType} recipes yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  Tap the heart icon on any recipe to save it as a favorite
                </Text>
              </View>
            ) : (
              <View style={styles.recipesList}>
                {favorites.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  content: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
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
  recipesList: {
    padding: 16,
  },
  recipeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recipeInfo: {
    flex: 1,
    paddingRight: 10,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeDescription: {
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
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
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
  cookingMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cookingMethodText: {
    fontSize: 14,
    marginLeft: 6,
  },
});