import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

export function PrivacyPolicyScreen({ navigation }: Props) {
  const { theme } = useTheme();

  const handleEmailPress = () => {
    Linking.openURL('mailto:privacy@coachmeld.com');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://coachmeld.com');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
          Last Updated: July 24, 2025
        </Text>

        <Text style={[styles.title, { color: theme.text }]}>
          Privacy Policy
        </Text>

        <Text style={[styles.paragraph, { color: theme.text }]}>
          CoachMeld ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          1. Information We Collect
        </Text>

        <Text style={[styles.subsectionTitle, { color: theme.text }]}>
          Personal Information
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          We collect information you provide directly to us, such as:
          {'\n'}• Email address and password
          {'\n'}• Name and profile information
          {'\n'}• Health metrics (height, weight, age)
          {'\n'}• Dietary preferences and restrictions
          {'\n'}• Health goals and objectives
          {'\n'}• Chat messages with AI coaches
        </Text>

        <Text style={[styles.subsectionTitle, { color: theme.text }]}>
          Automatically Collected Information
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          When you use our app, we automatically collect:
          {'\n'}• Device information (model, operating system)
          {'\n'}• App usage data and interactions
          {'\n'}• Error logs and performance data
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          2. How We Use Your Information
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          We use your information to:
          {'\n'}• Provide personalized AI coaching services
          {'\n'}• Generate customized meal plans and recommendations
          {'\n'}• Process payments and manage subscriptions
          {'\n'}• Improve our services and develop new features
          {'\n'}• Communicate with you about your account
          {'\n'}• Ensure compliance with our Terms of Service
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          3. Legal Basis for Processing (GDPR)
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          For users in the European Economic Area (EEA), we process your data based on:
          {'\n'}• <Text style={styles.bold}>Consent:</Text> For health data processing and personalized coaching
          {'\n'}• <Text style={styles.bold}>Contract:</Text> To provide our services and process payments
          {'\n'}• <Text style={styles.bold}>Legitimate interests:</Text> For improving our services and ensuring security
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          4. Data Sharing and Disclosure
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          We do not sell your personal information. We may share your data with:
          {'\n'}• Service providers (Supabase for data storage, Stripe for payments)
          {'\n'}• AI service providers (Google Gemini for coaching responses)
          {'\n'}• Legal authorities when required by law
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          5. Data Retention
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You can request deletion of your account and data at any time.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          6. Your Rights (GDPR)
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          If you are in the EEA, you have the right to:
          {'\n'}• <Text style={styles.bold}>Access:</Text> Request a copy of your personal data
          {'\n'}• <Text style={styles.bold}>Rectification:</Text> Correct inaccurate data
          {'\n'}• <Text style={styles.bold}>Erasure:</Text> Request deletion of your data
          {'\n'}• <Text style={styles.bold}>Portability:</Text> Receive your data in a portable format
          {'\n'}• <Text style={styles.bold}>Object:</Text> Object to certain data processing
          {'\n'}• <Text style={styles.bold}>Restrict:</Text> Request limited processing of your data
          {'\n'}• <Text style={styles.bold}>Withdraw consent:</Text> Withdraw consent at any time
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          To exercise these rights, please contact us at{' '}
          <Text style={[styles.link, { color: theme.primary }]} onPress={handleEmailPress}>
            privacy@coachmeld.com
          </Text>
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          7. Data Security
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          8. International Data Transfers
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in compliance with applicable laws.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          9. Children's Privacy
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          Our services are not intended for children under 16. We do not knowingly collect personal information from children under 16.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          10. Changes to This Policy
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date and, for significant changes, providing additional notice.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          11. Contact Us
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          If you have questions about this Privacy Policy or our data practices, please contact us at:
        </Text>
        <Text style={[styles.contactInfo, { color: theme.text }]}>
          CoachMeld{'\n'}
          Email:{' '}
          <Text style={[styles.link, { color: theme.primary }]} onPress={handleEmailPress}>
            privacy@coachmeld.com
          </Text>
          {'\n'}
          Website:{' '}
          <Text style={[styles.link, { color: theme.primary }]} onPress={handleWebsitePress}>
            https://coachmeld.com
          </Text>
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          12. Data Protection Officer
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          For GDPR-related inquiries, you can contact our Data Protection Officer at{' '}
          <Text style={[styles.link, { color: theme.primary }]} onPress={handleEmailPress}>
            privacy@coachmeld.com
          </Text>
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '600',
  },
  link: {
    textDecorationLine: 'underline',
  },
  contactInfo: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    paddingLeft: 16,
  },
  bottomSpacer: {
    height: 40,
  },
});