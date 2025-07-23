import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CookingPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: CookingPreferences) => void;
  initialPreferences: CookingPreferences;
}

export interface CookingPreferences {
  cookingMethods: string[];
  favoriteFoods: string;
  dislikedFoods: string;
  allergies: string;
  dietaryRestrictions: string;
}

const COOKING_METHODS = [
  { id: 'oven', label: 'Oven', icon: 'flame-outline' },
  { id: 'stovetop', label: 'Stovetop', icon: 'flame-outline' },
  { id: 'grill', label: 'Grill', icon: 'bonfire-outline' },
  { id: 'air_fryer', label: 'Air Fryer', icon: 'cube-outline' },
  { id: 'slow_cooker', label: 'Slow Cooker', icon: 'time-outline' },
  { id: 'instant_pot', label: 'Instant Pot', icon: 'speedometer-outline' },
  { id: 'microwave', label: 'Microwave', icon: 'radio-outline' },
  { id: 'no_cook', label: 'No Cook', icon: 'leaf-outline' },
];

export const CookingPreferencesModal: React.FC<CookingPreferencesModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPreferences,
}) => {
  const { theme } = useTheme();
  const [preferences, setPreferences] = useState<CookingPreferences>(initialPreferences);

  const toggleCookingMethod = (method: string) => {
    setPreferences(prev => ({
      ...prev,
      cookingMethods: prev.cookingMethods.includes(method)
        ? prev.cookingMethods.filter(m => m !== method)
        : [...prev.cookingMethods, method],
    }));
  };

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Cooking Preferences</Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Cooking Methods */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Cooking Methods</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Select all methods you have access to
              </Text>
              <View style={styles.methodsGrid}>
                {COOKING_METHODS.map(method => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodCard,
                      { 
                        backgroundColor: theme.surface,
                        borderColor: preferences.cookingMethods.includes(method.id) 
                          ? theme.primary 
                          : theme.border,
                        borderWidth: preferences.cookingMethods.includes(method.id) ? 2 : 1,
                      }
                    ]}
                    onPress={() => toggleCookingMethod(method.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={24}
                      color={preferences.cookingMethods.includes(method.id) 
                        ? theme.primary 
                        : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.methodLabel,
                        { 
                          color: preferences.cookingMethods.includes(method.id) 
                            ? theme.primary 
                            : theme.text 
                        }
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Favorite Foods */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Foods You Love</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="e.g., ribeye steak, bacon, eggs, salmon..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                value={preferences.favoriteFoods}
                onChangeText={(text) => setPreferences(prev => ({ ...prev, favoriteFoods: text }))}
              />
            </View>

            {/* Disliked Foods */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Foods You Dislike</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="e.g., liver, chicken breast, certain fish..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                value={preferences.dislikedFoods}
                onChangeText={(text) => setPreferences(prev => ({ ...prev, dislikedFoods: text }))}
              />
            </View>

            {/* Allergies */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Allergies</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="e.g., shellfish, eggs, dairy..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={2}
                value={preferences.allergies}
                onChangeText={(text) => setPreferences(prev => ({ ...prev, allergies: text }))}
              />
            </View>

            {/* Dietary Restrictions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Other Dietary Restrictions</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="e.g., no pork, kosher, halal, budget constraints..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={2}
                value={preferences.dietaryRestrictions}
                onChangeText={(text) => setPreferences(prev => ({ ...prev, dietaryRestrictions: text }))}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 16,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  methodCard: {
    width: '23%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  methodLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});