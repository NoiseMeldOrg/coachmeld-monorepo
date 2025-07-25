import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { gdprService, GDPRRequest, PrivacySettings } from '../services/gdprService';
import { format } from 'date-fns';

type PrivacySettingsNavigationProp = StackNavigationProp<RootStackParamList, 'PrivacySettings'>;

export function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<PrivacySettingsNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    shareDataForImprovements: false,
    allowAnalytics: false,
    marketingEmails: false,
  });
  const [activeRequests, setActiveRequests] = useState<GDPRRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [settings, requests] = await Promise.all([
        gdprService.getPrivacySettings(),
        gdprService.getActiveRequests(),
      ]);
      
      setPrivacySettings(settings);
      setActiveRequests(requests);
    } catch (err) {
      console.error('Error loading privacy data:', err);
      setError('Error loading settings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);

    try {
      await gdprService.updatePrivacySettings(newSettings);
    } catch (err) {
      console.error('Error updating settings:', err);
      // Revert on error
      setPrivacySettings(privacySettings);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.success || '#4CAF50';
      case 'processing':
        return theme.warning || '#FF9800';
      case 'pending':
        return theme.info || '#2196F3';
      case 'failed':
        return theme.error || '#F44336';
      default:
        return theme.textSecondary;
    }
  };

  const formatRequestType = (type: string) => {
    switch (type) {
      case 'export':
        return 'Data Export';
      case 'deletion':
        return 'Account Deletion';
      case 'correction':
        return 'Data Correction';
      case 'access':
        return 'Data Access';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error || '#ff3333' }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
      testID="privacy-settings-scroll"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Privacy Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Control how your data is collected and used
        </Text>
      </View>

      {/* Data Collection Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Data Collection
        </Text>

        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Share Data for Improvements
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              Help us improve our coaching algorithms with anonymous usage data
            </Text>
          </View>
          <Switch
            value={privacySettings.shareDataForImprovements}
            onValueChange={(value) => updateSetting('shareDataForImprovements', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={privacySettings.shareDataForImprovements ? theme.primary : '#f4f3f4'}
            ios_backgroundColor={theme.border}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Analytics
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              Allow us to collect anonymous app usage statistics
            </Text>
          </View>
          <Switch
            value={privacySettings.allowAnalytics}
            onValueChange={(value) => updateSetting('allowAnalytics', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={privacySettings.allowAnalytics ? theme.primary : '#f4f3f4'}
            ios_backgroundColor={theme.border}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Marketing Emails
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              Receive tips, updates, and special offers via email
            </Text>
          </View>
          <Switch
            value={privacySettings.marketingEmails}
            onValueChange={(value) => updateSetting('marketingEmails', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={privacySettings.marketingEmails ? theme.primary : '#f4f3f4'}
            ios_backgroundColor={theme.border}
          />
        </View>
      </View>

      {/* Your Rights */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Your Rights
        </Text>

        <TouchableOpacity
          style={[styles.rightItem, { borderBottomColor: theme.border }]}
          onPress={() => navigation.navigate('DataExport')}
        >
          <View style={styles.rightInfo}>
            <Ionicons name="download-outline" size={24} color={theme.primary} />
            <View style={styles.rightTextContainer}>
              <Text style={[styles.rightTitle, { color: theme.text }]}>
                Export My Data
              </Text>
              <Text style={[styles.rightDescription, { color: theme.textSecondary }]}>
                Download all your personal data in a portable format
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rightItem, { borderBottomColor: theme.border }]}
          onPress={() => navigation.navigate('DataCorrection')}
        >
          <View style={styles.rightInfo}>
            <Ionicons name="create-outline" size={24} color={theme.primary} />
            <View style={styles.rightTextContainer}>
              <Text style={[styles.rightTitle, { color: theme.text }]}>
                Correct My Data
              </Text>
              <Text style={[styles.rightDescription, { color: theme.textSecondary }]}>
                Request corrections to your personal information
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rightItem, { borderBottomColor: theme.border }]}
          onPress={() => navigation.navigate('DeleteAccount')}
        >
          <View style={styles.rightInfo}>
            <Ionicons name="trash-outline" size={24} color={theme.error || '#ff3333'} />
            <View style={styles.rightTextContainer}>
              <Text style={[styles.rightTitle, { color: theme.text }]}>
                Delete Account
              </Text>
              <Text style={[styles.rightDescription, { color: theme.textSecondary }]}>
                Permanently delete your account and all associated data
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Active Requests
          </Text>
          {activeRequests.map((request) => (
            <View
              key={request.id}
              style={[styles.requestItem, { borderBottomColor: theme.border }]}
            >
              <View style={styles.requestInfo}>
                <Text style={[styles.requestType, { color: theme.text }]}>
                  {formatRequestType(request.request_type)} - {request.status}
                </Text>
                <Text style={[styles.requestDate, { color: theme.textSecondary }]}>
                  Submitted: {format(new Date(request.created_at), 'MMM d, yyyy')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getRequestStatusColor(request.status) }
                ]}
              />
            </View>
          ))}
        </View>
      )}

      {/* Consent Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Consent Preferences
        </Text>
        <TouchableOpacity
          style={[styles.consentButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('ConsentManagement')}
        >
          <Text style={styles.consentButtonText}>Manage Consent</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Policy Link */}
      <TouchableOpacity
        style={styles.policyLink}
        onPress={() => navigation.navigate('PrivacyPolicy')}
      >
        <Text style={[styles.policyLinkText, { color: theme.primary }]}>
          View Privacy Policy
        </Text>
        <Ionicons name="open-outline" size={16} color={theme.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  rightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  rightTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  requestInfo: {
    flex: 1,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  consentButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  consentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  policyLinkText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 6,
  },
});