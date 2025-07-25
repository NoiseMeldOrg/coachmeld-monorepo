import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { gdprService } from '../services/gdprService';

interface ConsentCategory {
  id: string;
  title: string;
  description: string;
  required: boolean;
  enabled: boolean;
  legalBasis: string;
  dataTypes: string[];
}

export default function ConsentManagementScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consentCategories, setConsentCategories] = useState<ConsentCategory[]>([]);

  useEffect(() => {
    loadConsentSettings();
  }, []);

  const loadConsentSettings = async () => {
    try {
      setLoading(true);
      const currentConsent = await gdprService.getConsentStatus();
      
      // Define consent categories with current status
      const categories: ConsentCategory[] = [
        {
          id: 'essential',
          title: 'Essential Services',
          description: 'Required for app functionality including authentication, account management, and core coaching features.',
          required: true,
          enabled: true, // Always enabled for required services
          legalBasis: 'Contractual necessity (Article 6(1)(b))',
          dataTypes: ['Account information', 'Authentication tokens', 'Session data', 'Profile settings']
        },
        {
          id: 'health_coaching',
          title: 'Health Coaching & AI Processing',
          description: 'Process your health data, goals, and chat conversations to provide personalized AI coaching responses.',
          required: false,
          enabled: currentConsent?.health_data_processing ?? true,
          legalBasis: 'Consent (Article 6(1)(a)) + Special category consent (Article 9(2)(a))',
          dataTypes: ['Health metrics', 'Dietary preferences', 'Chat conversations', 'Progress data']
        },
        {
          id: 'meal_personalization',
          title: 'Meal Planning & Personalization',
          description: 'Use your dietary preferences, restrictions, and history to generate personalized meal plans and recipes.',
          required: false,
          enabled: currentConsent?.meal_personalization ?? true,
          legalBasis: 'Consent (Article 6(1)(a))',
          dataTypes: ['Food preferences', 'Dietary restrictions', 'Meal history', 'Recipe interactions']
        },
        {
          id: 'progress_tracking',
          title: 'Progress Tracking & Analytics',
          description: 'Store and analyze your progress data to show charts, trends, and coaching insights.',
          required: false,
          enabled: currentConsent?.progress_tracking ?? true,
          legalBasis: 'Consent (Article 6(1)(a))',
          dataTypes: ['Weight measurements', 'Progress photos', 'Goal achievements', 'Usage statistics']
        },
        {
          id: 'marketing_communications',
          title: 'Marketing Communications',
          description: 'Send you promotional emails, feature announcements, and health tips via email or push notifications.',
          required: false,
          enabled: currentConsent?.marketing_communications ?? false,
          legalBasis: 'Consent (Article 6(1)(a))',
          dataTypes: ['Email address', 'Communication preferences', 'Engagement history']
        },
        {
          id: 'analytics_improvement',
          title: 'Analytics & App Improvement',
          description: 'Collect anonymized usage data to improve app performance, identify bugs, and develop new features.',
          required: false,
          enabled: currentConsent?.analytics_tracking ?? false,
          legalBasis: 'Consent (Article 6(1)(a))',
          dataTypes: ['App usage patterns', 'Error logs', 'Performance metrics', 'Feature usage']
        }
      ];

      setConsentCategories(categories);
    } catch (error) {
      console.error('Error loading consent settings:', error);
      Alert.alert('Error', 'Failed to load consent settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentToggle = (categoryId: string, enabled: boolean) => {
    setConsentCategories(prev => 
      prev.map(category => 
        category.id === categoryId 
          ? { ...category, enabled }
          : category
      )
    );
  };

  const saveConsentSettings = async () => {
    try {
      setSaving(true);
      
      // Convert categories to consent object
      const consentData = consentCategories.reduce((acc, category) => {
        if (category.id === 'essential') return acc; // Skip essential as it's always required
        
        acc[category.id] = category.enabled;
        return acc;
      }, {} as Record<string, boolean>);

      await gdprService.updateConsent(consentData);
      
      Alert.alert(
        'Settings Saved',
        'Your consent preferences have been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving consent settings:', error);
      Alert.alert('Error', 'Failed to save consent settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const showDataTypesInfo = (category: ConsentCategory) => {
    Alert.alert(
      'Data Types Processed',
      `For ${category.title}:\n\n${category.dataTypes.join('\n• ')}\n\nLegal Basis: ${category.legalBasis}`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Consent Management
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading consent settings...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Consent Management
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={[styles.introTitle, { color: theme.text }]}>
            Your Data, Your Choice
          </Text>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            Control how your personal data is processed. You can change these settings at any time. 
            Required services cannot be disabled as they're essential for app functionality.
          </Text>
        </View>

        {consentCategories.map((category) => (
          <View 
            key={category.id}
            style={[
              styles.categoryCard,
              { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }
            ]}
          >
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleRow}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                  {category.title}
                </Text>
                {category.required && (
                  <View style={[styles.requiredBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>
              <Switch
                value={category.enabled}
                onValueChange={(enabled) => handleConsentToggle(category.id, enabled)}
                disabled={category.required || saving}
                trackColor={{ 
                  false: theme.textSecondary + '40', 
                  true: theme.primary + '60' 
                }}
                thumbColor={category.enabled ? theme.primary : theme.textSecondary}
              />
            </View>

            <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
              {category.description}
            </Text>

            <TouchableOpacity
              style={styles.dataTypesButton}
              onPress={() => showDataTypesInfo(category)}
            >
              <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
              <Text style={[styles.dataTypesText, { color: theme.primary }]}>
                View data types & legal basis
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.legalNotice}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
          <Text style={[styles.legalNoticeText, { color: theme.textSecondary }]}>
            These settings comply with GDPR Articles 6, 7, and 9. You have the right to withdraw 
            consent at any time. Withdrawal will not affect processing based on consent before withdrawal.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { 
              backgroundColor: theme.primary,
              opacity: saving ? 0.6 : 1
            }
          ]}
          onPress={saveConsentSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Consent Preferences</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  introSection: {
    paddingVertical: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
  },
  categoryCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  requiredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  dataTypesButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataTypesText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  legalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginVertical: 16,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  legalNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});