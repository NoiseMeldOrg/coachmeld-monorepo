import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useEUDetection } from '../hooks/useEUDetection';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface CookieConsentBannerProps {
  onConsentChange?: (preferences: ConsentPreferences) => void;
}

export default function CookieConsentBanner({ onConsentChange }: CookieConsentBannerProps) {
  const { theme } = useTheme();
  const { isEUUser } = useEUDetection();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: false,
    marketing: false,
    functional: true, // Always true for essential functionality
  });

  useEffect(() => {
    checkConsentRequired();
  }, [isEUUser]);

  const checkConsentRequired = async () => {
    // Only show for EU users who haven't given consent
    if (!isEUUser) return;

    try {
      const consentGiven = await AsyncStorage.getItem('cookie_consent_given');
      const consentDate = await AsyncStorage.getItem('cookie_consent_date');
      
      // Show banner if no consent given or consent is older than 12 months
      if (!consentGiven || (consentDate && isConsentExpired(consentDate))) {
        setShowBanner(true);
      } else {
        // Load existing preferences
        const savedPreferences = await AsyncStorage.getItem('cookie_consent_preferences');
        if (savedPreferences) {
          setPreferences(JSON.parse(savedPreferences));
        }
      }
    } catch (error) {
      console.error('Error checking cookie consent:', error);
    }
  };

  const isConsentExpired = (consentDate: string): boolean => {
    const given = new Date(consentDate);
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return given < twelveMonthsAgo;
  };

  const handleAcceptAll = async () => {
    const newPreferences: ConsentPreferences = {
      analytics: true,
      marketing: true,
      functional: true,
    };
    
    await saveConsent(newPreferences);
    setShowBanner(false);
  };

  const handleRejectAll = async () => {
    const newPreferences: ConsentPreferences = {
      analytics: false,
      marketing: false,
      functional: true, // Always true for essential functionality
    };
    
    await saveConsent(newPreferences);
    setShowBanner(false);
  };

  const handleCustomize = () => {
    setShowSettings(true);
  };

  const handleSaveCustom = async () => {
    await saveConsent(preferences);
    setShowSettings(false);
    setShowBanner(false);
  };

  const saveConsent = async (newPreferences: ConsentPreferences) => {
    try {
      await AsyncStorage.setItem('cookie_consent_given', 'true');
      await AsyncStorage.setItem('cookie_consent_date', new Date().toISOString());
      await AsyncStorage.setItem('cookie_consent_preferences', JSON.stringify(newPreferences));
      
      setPreferences(newPreferences);
      onConsentChange?.(newPreferences);
      
      // Log consent for audit purposes
      console.log('Cookie consent updated:', newPreferences);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
      Alert.alert('Error', 'Failed to save consent preferences. Please try again.');
    }
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === 'functional') return; // Can't disable functional cookies
    
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Don't show for non-EU users or if consent already handled
  if (!isEUUser || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Main Consent Banner */}
      <View style={[styles.banner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.bannerContent}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
          <View style={styles.textContent}>
            <Text style={[styles.bannerTitle, { color: theme.text }]}>
              Cookie Consent
            </Text>
            <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
              We use cookies to enhance your experience and analyze app usage. 
              You can choose which cookies to accept.
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}
            onPress={handleRejectAll}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>
              Reject All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={handleCustomize}
          >
            <Text style={[styles.buttonText, { color: theme.primary }]}>
              Customize
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleAcceptAll}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>
              Accept All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Customization Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Cookie Preferences
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSettings(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                Choose which types of cookies you want to allow. Some cookies are essential 
                for the app to function properly and cannot be disabled.
              </Text>
              
              {/* Functional Cookies */}
              <View style={[styles.cookieCategory, { borderBottomColor: theme.border }]}>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    Essential Cookies
                  </Text>
                  <View style={[styles.requiredBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                </View>
                <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
                  These cookies are necessary for the app to function and cannot be disabled. 
                  They include authentication, security, and core functionality.
                </Text>
              </View>
              
              {/* Analytics Cookies */}
              <View style={[styles.cookieCategory, { borderBottomColor: theme.border }]}>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    Analytics Cookies
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      { 
                        backgroundColor: preferences.analytics ? theme.primary : theme.textSecondary + '40'
                      }
                    ]}
                    onPress={() => togglePreference('analytics')}
                  >
                    <View style={[
                      styles.toggleKnob,
                      {
                        backgroundColor: 'white',
                        transform: [{ translateX: preferences.analytics ? 20 : 2 }]
                      }
                    ]} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
                  Help us understand how you use the app so we can improve your experience. 
                  Data is anonymized and aggregated.
                </Text>
              </View>
              
              {/* Marketing Cookies */}
              <View style={styles.cookieCategory}>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    Marketing Cookies
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      { 
                        backgroundColor: preferences.marketing ? theme.primary : theme.textSecondary + '40'
                      }
                    ]}
                    onPress={() => togglePreference('marketing')}
                  >
                    <View style={[
                      styles.toggleKnob,
                      {
                        backgroundColor: 'white',
                        transform: [{ translateX: preferences.marketing ? 20 : 2 }]
                      }
                    ]} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
                  Used to deliver personalized content and advertisements. 
                  Helps us understand which features you find most valuable.
                </Text>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveCustom}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Save Preferences
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  textContent: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 1,
  },
  tertiaryButton: {
    // Plain button with primary text color
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  cookieCategory: {
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});