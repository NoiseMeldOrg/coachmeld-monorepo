import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { gdprService } from '../services/gdprService';

interface GDPRConsentFlowProps {
  isEUUser: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export const GDPRConsentFlow: React.FC<GDPRConsentFlowProps> = ({
  isEUUser,
  onComplete,
  onSkip,
}) => {
  const { theme } = useTheme();
  const [dataProcessing, setDataProcessing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    // Data processing consent is mandatory
    if (isEUUser && !dataProcessing) {
      Alert.alert(
        'Required Consent',
        'You must accept data processing to use CoachMeld. This is necessary to provide our coaching services.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await gdprService.saveConsent({
        dataProcessing: dataProcessing || !isEUUser, // Always true for non-EU
        analytics,
        marketing,
        version: '2.0',
      });

      onComplete();
    } catch (err) {
      console.error('Error saving consent:', err);
      setError('Error saving preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEUConsent = () => (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        Your Privacy Matters to Us
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        As an EU user, you have special rights under GDPR. Please review and consent to how we process your data.
      </Text>

      <View style={styles.consentSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Data Processing Consent
        </Text>

        <View style={styles.consentItem}>
          <View style={styles.consentHeader}>
            <View style={styles.consentTextContainer}>
              <Text style={[styles.consentTitle, { color: theme.text }]}>
                Essential Data Processing
              </Text>
              <Text style={[styles.consentDescription, { color: theme.textSecondary }]}>
                Process your health data to provide personalized coaching
              </Text>
              <Text style={[styles.legalBasis, { color: theme.textSecondary }]}>
                Legal basis: Contract fulfillment
              </Text>
            </View>
            <Switch
              value={dataProcessing}
              onValueChange={setDataProcessing}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={dataProcessing ? theme.primary : '#f4f3f4'}
              ios_backgroundColor={theme.border}
            />
          </View>
        </View>

        <View style={styles.consentItem}>
          <View style={styles.consentHeader}>
            <View style={styles.consentTextContainer}>
              <Text style={[styles.consentTitle, { color: theme.text }]}>
                Analytics & Improvements
              </Text>
              <Text style={[styles.consentDescription, { color: theme.textSecondary }]}>
                Help us improve our service through anonymous usage data
              </Text>
              <Text style={[styles.legalBasis, { color: theme.textSecondary }]}>
                Legal basis: Legitimate interest
              </Text>
            </View>
            <Switch
              value={analytics}
              onValueChange={setAnalytics}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={analytics ? theme.primary : '#f4f3f4'}
              ios_backgroundColor={theme.border}
            />
          </View>
        </View>

        <View style={styles.consentItem}>
          <View style={styles.consentHeader}>
            <View style={styles.consentTextContainer}>
              <Text style={[styles.consentTitle, { color: theme.text }]}>
                Marketing Communications
              </Text>
              <Text style={[styles.consentDescription, { color: theme.textSecondary }]}>
                Receive tips, updates, and special offers via email
              </Text>
              <Text style={[styles.legalBasis, { color: theme.textSecondary }]}>
                Legal basis: Consent
              </Text>
            </View>
            <Switch
              value={marketing}
              onValueChange={setMarketing}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={marketing ? theme.primary : '#f4f3f4'}
              ios_backgroundColor={theme.border}
            />
          </View>
        </View>
      </View>

      <View style={styles.rightsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Your Rights Under GDPR
        </Text>
        <View style={styles.rightsList}>
          <View style={styles.rightItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.rightText, { color: theme.textSecondary }]}>
              Access your personal data anytime
            </Text>
          </View>
          <View style={styles.rightItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.rightText, { color: theme.textSecondary }]}>
              Request corrections to your data
            </Text>
          </View>
          <View style={styles.rightItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.rightText, { color: theme.textSecondary }]}>
              Export your data in machine-readable format
            </Text>
          </View>
          <View style={styles.rightItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.rightText, { color: theme.textSecondary }]}>
              Delete your account and all associated data
            </Text>
          </View>
          <View style={styles.rightItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.rightText, { color: theme.textSecondary }]}>
              Withdraw consent at any time
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderNonEUConsent = () => (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        Privacy & Data Usage
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        We take your privacy seriously. Here's how we use your data to provide personalized coaching.
      </Text>

      <View style={styles.simpleConsentSection}>
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              Your Data is Secure
            </Text>
            <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
              We use industry-standard encryption to protect your health information
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="person" size={24} color={theme.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              Personalized Coaching
            </Text>
            <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
              We process your health data to provide tailored diet and nutrition advice
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="analytics" size={24} color={theme.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              Service Improvements
            </Text>
            <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
              Anonymous usage data helps us improve the coaching experience
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEUUser ? renderEUConsent() : renderNonEUConsent()}

        <TouchableOpacity
          style={styles.privacyPolicyLink}
          onPress={() => setShowPrivacyPolicy(true)}
        >
          <Text style={[styles.privacyPolicyText, { color: theme.primary }]}>
            Read our full Privacy Policy
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.primary} />
        </TouchableOpacity>

        {error && (
          <Text style={[styles.errorText, { color: theme.error || '#ff3333' }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { 
              backgroundColor: theme.primary,
              opacity: (isEUUser && !dataProcessing) ? 0.5 : 1,
            }
          ]}
          onPress={handleContinue}
          disabled={loading || (isEUUser && !dataProcessing)}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {onSkip && !isEUUser && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
          >
            <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyPolicy(false)}
        testID="privacy-policy-modal"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Privacy Policy
            </Text>
            <TouchableOpacity
              onPress={() => setShowPrivacyPolicy(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.policyText, { color: theme.text }]}>
              {/* This would be loaded from gdprService.getPrivacyPolicy() */}
              Privacy policy content would be displayed here...
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  consentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  consentItem: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  consentTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  consentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  legalBasis: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  rightsSection: {
    marginBottom: 24,
  },
  rightsList: {
    marginTop: 12,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rightText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  simpleConsentSection: {
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  privacyPolicyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  privacyPolicyText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    backgroundColor: 'transparent',
  },
  continueButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
  },
});