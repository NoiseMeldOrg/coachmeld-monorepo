import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Recipe } from '../services/mealPlanService';

interface RecipeDetailModalProps {
  visible: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  visible,
  recipe,
  onClose,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const { theme } = useTheme();

  if (!recipe) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Recipe Details</Text>
          <TouchableOpacity onPress={onToggleFavorite} style={styles.favoriteButton}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={28} 
              color={isFavorite ? theme.error : theme.text} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipe Title and Description */}
          <View style={styles.titleSection}>
            <Text style={[styles.recipeTitle, { color: theme.text }]}>{recipe.name}</Text>
            <Text style={[styles.recipeDescription, { color: theme.textSecondary }]}>
              {recipe.description}
            </Text>
          </View>

          {/* Nutrition Info */}
          <View style={[styles.nutritionCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Nutrition Facts</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: theme.primary }]}>
                  {recipe.calories}
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>
                  Calories
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: theme.primary }]}>
                  {recipe.proteinG}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>
                  Protein
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: theme.primary }]}>
                  {recipe.fatG}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>
                  Fat
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: theme.primary }]}>
                  {recipe.carbsG}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>
                  Carbs
                </Text>
              </View>
            </View>
          </View>

          {/* Cooking Info */}
          <View style={[styles.cookingInfo, { backgroundColor: theme.surface }]}>
            <View style={styles.cookingItem}>
              <Ionicons name="flame-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.cookingText, { color: theme.text }]}>
                {recipe.cookingMethod || 'Not specified'}
              </Text>
            </View>
            {recipe.prepTimeMinutes !== undefined && (
              <View style={styles.cookingItem}>
                <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.cookingText, { color: theme.text }]}>
                  Prep: {recipe.prepTimeMinutes} min
                </Text>
              </View>
            )}
            {recipe.cookTimeMinutes !== undefined && (
              <View style={styles.cookingItem}>
                <Ionicons name="timer-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.cookingText, { color: theme.text }]}>
                  Cook: {recipe.cookTimeMinutes} min
                </Text>
              </View>
            )}
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingredients</Text>
            {recipe.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: theme.primary }]}>•</Text>
                <Text style={[styles.listText, { color: theme.text }]}>{ingredient}</Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Instructions</Text>
            {recipe.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.text }]}>
                  {instruction}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => {/* TODO: Chat with coach about recipe */}}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Chat with Coach</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  nutritionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  nutritionItem: {
    width: '50%',
    paddingHorizontal: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  nutritionLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  cookingInfo: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  cookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cookingText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 20,
  },
  bullet: {
    fontSize: 18,
    marginRight: 12,
    marginTop: -2,
  },
  listText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  actionButtons: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});