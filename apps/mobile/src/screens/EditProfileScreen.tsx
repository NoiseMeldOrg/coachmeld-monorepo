import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileSettingRow } from '../components/ProfileSettingRow';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { DatePickerModal } from '../components/DatePickerModal';
import { HeightPickerModal } from '../components/HeightPickerModal';
import { WeightPickerModal } from '../components/WeightPickerModal';
import { UserProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { CookingPreferencesModal, CookingPreferences } from '../components/CookingPreferencesModal';

type EditableField = 
  | 'name'
  | 'dateOfBirth'
  | 'gender'
  | 'height'
  | 'weight'
  | 'goalWeight'
  | 'units'
  | 'activityLevel'
  | 'dietType'
  | 'healthGoals'
  | 'healthConditions'
  | 'dietaryPreferences';

interface EditProfileScreenProps {
  isFromTab?: boolean;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ isFromTab = false }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { userProfile, updateUserProfile } = useUser();
  const { user } = useAuth();
  const { signOut } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingField, setPendingField] = useState<EditableField | null>(null);
  
  // Modal states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [weightPickerTitle, setWeightPickerTitle] = useState('Weight');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCookingPreferences, setShowCookingPreferences] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    dateOfBirth: undefined,
    age: 0,
    gender: '',
    height: 0,
    weight: 0,
    goalWeight: 0,
    units: 'imperial',
    healthGoals: [],
    dietaryPreferences: [],
    healthConditions: [],
    customHealthConditions: '',
    activityLevel: 'moderately_active',
  });

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  // Helper functions
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatHeight = (height: number, units: 'imperial' | 'metric'): string => {
    if (height === 0) return 'Not set';
    if (units === 'imperial') {
      const feet = Math.floor(height / 12);
      const inches = height % 12;
      return `${feet} ft ${inches} in`;
    }
    return `${height} cm`;
  };

  const formatWeight = (weight: number, units: 'imperial' | 'metric'): string => {
    if (weight === 0) return 'Not set';
    return `${weight} ${units === 'imperial' ? 'lbs' : 'kg'}`;
  };

  // Fields that affect calculations
  const fieldsAffectingCalculations: EditableField[] = [
    'height', 'weight', 'goalWeight', 'activityLevel', 'dateOfBirth', 'gender'
  ];

  const handleFieldPress = (field: EditableField) => {
    console.log('Field pressed:', field);
    if (fieldsAffectingCalculations.includes(field)) {
      setPendingField(field);
      setShowConfirmation(true);
    } else {
      openFieldEditor(field);
    }
  };

  const openFieldEditor = (field: EditableField) => {
    console.log('Opening field editor for:', field);
    setEditingField(field);
    
    switch (field) {
      case 'dateOfBirth':
        setShowDatePicker(true);
        break;
      case 'height':
        setShowHeightPicker(true);
        break;
      case 'weight':
        setWeightPickerTitle('Current Weight');
        setShowWeightPicker(true);
        break;
      case 'goalWeight':
        setWeightPickerTitle('Goal Weight');
        setShowWeightPicker(true);
        break;
      case 'name':
      case 'gender':
      case 'units':
      case 'activityLevel':
      case 'dietType':
      case 'healthGoals':
      case 'healthConditions':
      case 'dietaryPreferences':
        // Navigate to specific edit screens
        console.log('Navigating to EditProfileField with:', { field, currentProfile: profile });
        navigation.navigate('EditProfileField', { field, currentProfile: profile });
        break;
    }
  };

  const handleDateConfirm = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const age = calculateAge(dateString);
    
    setProfile({ ...profile, dateOfBirth: dateString, age });
    updateUserProfile({ ...profile, dateOfBirth: dateString, age });
    setShowDatePicker(false);
  };

  const handleHeightConfirm = (height: number) => {
    setProfile({ ...profile, height });
    updateUserProfile({ ...profile, height });
    setShowHeightPicker(false);
  };

  const handleWeightConfirm = (weight: number) => {
    if (editingField === 'weight') {
      setProfile({ ...profile, weight });
      updateUserProfile({ ...profile, weight });
    } else if (editingField === 'goalWeight') {
      setProfile({ ...profile, goalWeight: weight });
      updateUserProfile({ ...profile, goalWeight: weight });
    }
    setShowWeightPicker(false);
  };

  const getActivityLevelDisplay = (level: string): string => {
    const labels: Record<string, string> = {
      sedentary: 'Sedentary',
      lightly_active: 'Lightly Active',
      moderately_active: 'Moderately Active',
      very_active: 'Very Active',
      extra_active: 'Extra Active',
    };
    return labels[level] || 'Not set';
  };

  const getDietTypeDisplay = (diet?: string): string => {
    if (!diet) return 'None';
    const labels: Record<string, string> = {
      paleo: 'Paleo',
      lowcarb: 'Low Carb',
      keto: 'Keto',
      ketovore: 'Ketovore',
      carnivore: 'Carnivore',
      lion: 'Lion Diet',
    };
    return labels[diet] || 'None';
  };

  const getHealthConditionsDisplay = (profile: any): string => {
    const selectedCount = profile.healthConditions?.length || 0;
    const hasCustom = profile.customHealthConditions && profile.customHealthConditions.trim().length > 0;
    
    if (selectedCount === 0 && !hasCustom) {
      return 'None';
    }
    
    const parts = [];
    if (selectedCount > 0) {
      parts.push(`${selectedCount} selected`);
    }
    if (hasCustom) {
      parts.push('custom notes');
    }
    
    return parts.join(', ');
  };

  const toggleUnits = () => {
    const newUnits: 'imperial' | 'metric' = profile.units === 'imperial' ? 'metric' : 'imperial';
    const updatedProfile = { ...profile, units: newUnits };
    setProfile(updatedProfile);
    updateUserProfile(updatedProfile);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      // Submit deletion request
      const { data, error } = await supabase
        .rpc('submit_deletion_request', {
          deletion_reason: 'User requested account deletion via app'
        });
      
      if (error) {
        console.error('Error submitting deletion request:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to submit deletion request');
      }
      
      // Sign out the user
      await signOut();
      
      Alert.alert(
        'Deletion Request Submitted',
        'Your account deletion request has been submitted. Your account will be permanently deleted within 24-48 hours. You will receive an email confirmation once the deletion is complete.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      if (error.message?.includes('already pending')) {
        Alert.alert(
          'Request Already Submitted',
          'You have already submitted a deletion request. Your account will be deleted within 24-48 hours.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to submit deletion request. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const confirmDeleteAccount = () => {
    setShowDeleteConfirmation(true);
  };

  const handleCookingPreferencesSave = async (preferences: CookingPreferences) => {
    const updatedProfile = {
      ...profile,
      cookingMethods: preferences.cookingMethods,
      favoriteFoods: preferences.favoriteFoods,
      dislikedFoods: preferences.dislikedFoods,
      allergies: preferences.allergies,
      dietaryRestrictions: preferences.dietaryRestrictions,
    };
    
    await updateUserProfile(updatedProfile);
    setProfile(updatedProfile);
  };

  // Calculate min and max dates for date picker
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Fixed Header - only show when not from tab */}
      {!isFromTab && (
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.background, 
            borderBottomColor: theme.border,
            paddingTop: Platform.OS === 'android' ? insets.top : 0
          }
        ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
          <View style={styles.headerButton} />
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView 
        style={[styles.scrollView, isFromTab && styles.scrollViewFromTab]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Header */}
        <View style={[styles.userInfoHeader, { backgroundColor: theme.surface }]}>
          <View style={styles.userInfoContent}>
            <View style={[styles.userAvatar, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons 
                name="person-circle-outline" 
                size={60} 
                color={theme.primary} 
              />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: theme.text }]}>
                {profile.name || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user?.email || 'No email'}
              </Text>
            </View>
          </View>
          {!hasActiveSubscription && (
            <TouchableOpacity 
              style={[styles.goProButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Subscription' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.goProButtonText}>Go Pro</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Information Section */}
        <View style={[styles.section, styles.firstSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Profile Information
          </Text>
          <ProfileSettingRow
            label="Name"
            value={profile.name || 'Not set'}
            onPress={() => handleFieldPress('name')}
          />
          <ProfileSettingRow
            label="Date of Birth"
            value={formatDate(profile.dateOfBirth)}
            onPress={() => handleFieldPress('dateOfBirth')}
          />
          <ProfileSettingRow
            label="Gender"
            value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set'}
            onPress={() => handleFieldPress('gender')}
            isLast
          />
        </View>

        {/* Physical Stats Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Physical Stats
          </Text>
          <ProfileSettingRow
            label="Height"
            value={formatHeight(profile.height || 0, profile.units)}
            onPress={() => handleFieldPress('height')}
          />
          <ProfileSettingRow
            label="Current Weight"
            value={formatWeight(profile.weight || 0, profile.units)}
            onPress={() => handleFieldPress('weight')}
          />
          <ProfileSettingRow
            label="Goal Weight"
            value={formatWeight(profile.goalWeight || 0, profile.units)}
            onPress={() => handleFieldPress('goalWeight')}
            isLast
          />
        </View>

        {/* Activity & Goals Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Activity & Goals
          </Text>
          <ProfileSettingRow
            label="Activity Level"
            value={getActivityLevelDisplay(profile.activityLevel)}
            onPress={() => handleFieldPress('activityLevel')}
          />
          <ProfileSettingRow
            label="Diet Type"
            value={getDietTypeDisplay(profile.dietType)}
            onPress={() => handleFieldPress('dietType')}
          />
          <ProfileSettingRow
            label="Health Goals"
            value={profile.healthGoals.length > 0 ? `${profile.healthGoals.length} selected` : 'None'}
            onPress={() => handleFieldPress('healthGoals')}
          />
          <ProfileSettingRow
            label="Health Conditions"
            value={getHealthConditionsDisplay(profile)}
            onPress={() => handleFieldPress('healthConditions')}
            isLast
          />
        </View>

        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Preferences
          </Text>
          <ProfileSettingRow
            label="Dietary Preferences"
            value={profile.dietaryPreferences.length > 0 ? `${profile.dietaryPreferences.length} selected` : 'None'}
            onPress={() => handleFieldPress('dietaryPreferences')}
          />
          <ProfileSettingRow
            label="Cooking Preferences"
            value="Tap to set"
            onPress={() => setShowCookingPreferences(true)}
            isLast
          />
        </View>

        {/* App Settings Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            App Settings
          </Text>
          <ProfileSettingRow
            label="Theme"
            value={isDark ? 'Dark' : 'Light'}
            onPress={toggleTheme}
          />
          <ProfileSettingRow
            label="Units"
            value={profile.units === 'imperial' ? 'Imperial (ft/lbs)' : 'Metric (cm/kg)'}
            onPress={toggleUnits}
          />
          <ProfileSettingRow
            label="Saved Recipes"
            value=""
            onPress={() => navigation.navigate('SavedRecipes' as any)}
            showArrow
            isLast
          />
        </View>

        {/* Legal Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Legal
          </Text>
          <ProfileSettingRow
            label="Privacy Policy"
            value=""
            onPress={() => navigation.navigate('PrivacyPolicy' as any)}
            showArrow
          />
          <ProfileSettingRow
            label="Terms of Service"
            value=""
            onPress={() => Linking.openURL('https://coachmeld.com/terms')}
            showArrow
            isLast
          />
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Account
          </Text>
          <ProfileSettingRow
            label="Manage Subscription"
            value=""
            onPress={() => navigation.navigate('Subscription' as any)}
            showArrow
          />
          <ProfileSettingRow
            label="Sign Out"
            value=""
            onPress={handleSignOut}
            showArrow={false}
          />
          <TouchableOpacity
            style={[styles.deleteAccountButton, { borderTopColor: theme.border }]}
            onPress={confirmDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={[styles.deleteAccountText, { color: '#dc2626' }]}>
              Delete Account
            </Text>
            {isDeleting && (
              <ActivityIndicator size="small" color="#dc2626" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={showConfirmation}
        title="Are you sure?"
        message="This will recalculate your calorie and nutrient goals which will overwrite any custom settings. Would you like to continue?"
        onConfirm={() => {
          setShowConfirmation(false);
          if (pendingField) {
            openFieldEditor(pendingField);
            setPendingField(null);
          }
        }}
        onCancel={() => {
          setShowConfirmation(false);
          setPendingField(null);
        }}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        value={profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date(maxDate)}
        minimumDate={minDate}
        maximumDate={maxDate}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Height Picker Modal */}
      <HeightPickerModal
        visible={showHeightPicker}
        value={profile.height || 0}
        units={profile.units}
        onConfirm={handleHeightConfirm}
        onCancel={() => setShowHeightPicker(false)}
      />

      {/* Weight Picker Modal */}
      <WeightPickerModal
        visible={showWeightPicker}
        value={editingField === 'weight' ? (profile.weight || 0) : (profile.goalWeight || 0)}
        units={profile.units}
        title={weightPickerTitle}
        onConfirm={handleWeightConfirm}
        onCancel={() => setShowWeightPicker(false)}
      />

      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteConfirmation}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your account? This action cannot be undone. All your data, including your profile, messages, and subscriptions will be permanently deleted."
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmStyle={{ backgroundColor: '#dc2626' }}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      {/* Cooking Preferences Modal */}
      <CookingPreferencesModal
        visible={showCookingPreferences}
        onClose={() => setShowCookingPreferences(false)}
        onSave={handleCookingPreferencesSave}
        initialPreferences={{
          cookingMethods: userProfile?.cookingMethods || [],
          favoriteFoods: userProfile?.favoriteFoods || '',
          dislikedFoods: userProfile?.dislikedFoods || '',
          allergies: userProfile?.allergies || '',
          dietaryRestrictions: userProfile?.dietaryRestrictions || '',
        }}
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
    paddingBottom: 10,
    paddingTop: 10,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewFromTab: {
    marginTop: 0,
  },
  scrollContent: {
    // paddingBottom is set dynamically using safe area insets
  },
  section: {
    marginTop: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  firstSection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  userInfoHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  goProButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'stretch',
  },
  goProButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '500',
  },
});