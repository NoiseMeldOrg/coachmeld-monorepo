import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';

const healthGoalOptions = [
  'Weight Loss',
  'Muscle Gain',
  'Improved Energy',
  'Better Sleep',
  'Mental Clarity',
  'Reduce Inflammation',
  'Digestive Health',
  'Athletic Performance',
];

const dietaryPreferenceOptions = [
  'Strict Carnivore',
  'Meat & Eggs',
  'Include Dairy',
  'Organ Meats',
  'Fish & Seafood',
];

const healthConditionOptions = [
  'Diabetes',
  'High Blood Pressure',
  'Heart Disease',
  'High Cholesterol',
  'Autoimmune Condition',
  'Digestive Issues',
  'Food Sensitivities',
  'Thyroid Issues',
  'PCOS',
  'Arthritis',
  'Other',
];

export const EditProfileFieldScreen: React.FC = () => {
  const { theme } = useTheme();
  const { updateUserProfile } = useUser();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const { field, currentProfile } = route.params;
  const [value, setValue] = useState<any>(currentProfile[field]);
  const [customHealthConditions, setCustomHealthConditions] = useState<string>(currentProfile.customHealthConditions || '');

  const getFieldTitle = (field: string): string => {
    const titles: Record<string, string> = {
      name: 'Name',
      gender: 'Gender',
      units: 'Units',
      activityLevel: 'Activity Level',
      dietType: 'Diet Type',
      healthGoals: 'Health Goals',
      healthConditions: 'Health Conditions',
      dietaryPreferences: 'Dietary Preferences',
    };
    return titles[field] || field;
  };

  const handleSave = async () => {
    if (field === 'name' && (!value || !value.trim())) {
      Alert.alert('Invalid Name', 'Please enter your name');
      return;
    }

    let updatedProfile = { ...currentProfile, [field]: value };
    
    // For health conditions, also save the custom text field
    if (field === 'healthConditions') {
      updatedProfile = { ...updatedProfile, customHealthConditions };
    }
    
    await updateUserProfile(updatedProfile);
    navigation.goBack();
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  const renderFieldInput = () => {
    switch (field) {
      case 'name':
        return (
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={value}
            onChangeText={setValue}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />
        );

      case 'gender':
        return (
          <View style={styles.optionsContainer}>
            {['male', 'female'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  { backgroundColor: theme.inputBackground },
                  value === option && { backgroundColor: theme.primary }
                ]}
                onPress={() => setValue(option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  { color: theme.text },
                  value === option && { color: '#ffffff' }
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'units':
        return (
          <View style={styles.optionsContainer}>
            {[
              { value: 'imperial', label: 'Imperial (ft/lbs)' },
              { value: 'metric', label: 'Metric (cm/kg)' }
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  { backgroundColor: theme.inputBackground },
                  value === option.value && { backgroundColor: theme.primary }
                ]}
                onPress={() => setValue(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  { color: theme.text },
                  value === option.value && { color: '#ffffff' }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'activityLevel':
        return (
          <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground }]}>
            <Picker
              selectedValue={value}
              onValueChange={setValue}
              style={{ color: theme.text }}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label="Sedentary" value="sedentary" color={theme.text} />
              <Picker.Item label="Lightly Active" value="lightly_active" color={theme.text} />
              <Picker.Item label="Moderately Active" value="moderately_active" color={theme.text} />
              <Picker.Item label="Very Active" value="very_active" color={theme.text} />
              <Picker.Item label="Extra Active" value="extra_active" color={theme.text} />
            </Picker>
          </View>
        );

      case 'dietType':
        return (
          <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground }]}>
            <Picker
              selectedValue={value || ''}
              onValueChange={setValue}
              style={{ color: theme.text }}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label="None" value="" color={theme.text} />
              <Picker.Item label="Paleo" value="paleo" color={theme.text} />
              <Picker.Item label="Low Carb" value="lowcarb" color={theme.text} />
              <Picker.Item label="Keto" value="keto" color={theme.text} />
              <Picker.Item label="Ketovore" value="ketovore" color={theme.text} />
              <Picker.Item label="Carnivore" value="carnivore" color={theme.text} />
              <Picker.Item label="Lion Diet" value="lion" color={theme.text} />
            </Picker>
          </View>
        );

      case 'healthGoals':
        return (
          <View style={styles.checkboxContainer}>
            {healthGoalOptions.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={styles.checkboxItem}
                onPress={() => setValue(toggleArrayItem(value || [], goal))}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  (value || []).includes(goal) && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}>
                  {(value || []).includes(goal) && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.text }]}>{goal}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'dietaryPreferences':
        return (
          <View style={styles.checkboxContainer}>
            {dietaryPreferenceOptions.map((pref) => (
              <TouchableOpacity
                key={pref}
                style={styles.checkboxItem}
                onPress={() => setValue(toggleArrayItem(value || [], pref))}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  (value || []).includes(pref) && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}>
                  {(value || []).includes(pref) && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.text }]}>{pref}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'healthConditions':
        return (
          <View style={styles.checkboxContainer}>
            {healthConditionOptions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={styles.checkboxItem}
                onPress={() => setValue(toggleArrayItem(value || [], condition))}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  (value || []).includes(condition) && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}>
                  {(value || []).includes(condition) && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.text }]}>{condition}</Text>
              </TouchableOpacity>
            ))}
            
            {/* Custom health conditions text field */}
            <View style={styles.customConditionsContainer}>
              <Text style={[styles.customConditionsLabel, { color: theme.text }]}>
                Additional Health Conditions:
              </Text>
              <TextInput
                style={[
                  styles.customConditionsInput,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    color: theme.text 
                  }
                ]}
                value={customHealthConditions}
                onChangeText={setCustomHealthConditions}
                placeholder="Enter any other health conditions, medications, or medical notes for your coach..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[
        styles.header, 
        { 
          borderBottomColor: theme.border,
          paddingTop: Platform.OS === 'android' ? insets.top + 12 : 12
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {getFieldTitle(field)}
        </Text>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputSection}>
          {renderFieldInput()}
        </View>
      </ScrollView>
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
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  inputSection: {
    padding: 20,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  customConditionsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  customConditionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  customConditionsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
  },
});