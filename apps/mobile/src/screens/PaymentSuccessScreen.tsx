import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Home: undefined;
  CoachMarketplace: undefined;
  Marketplace: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const PaymentSuccessScreen: React.FC = () => {
  const { theme } = useTheme();
  const { refreshSubscriptions } = useSubscription();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Refresh subscriptions to get updated status
        await refreshSubscriptions();
        setLoading(false);
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('Unable to verify payment status. Please check your profile.');
        setLoading(false);
      }
    };

    // Add a small delay to ensure webhook has processed
    setTimeout(verifyPayment, 2000);
  }, [refreshSubscriptions]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Verifying your payment...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.error} />
        <Text style={[styles.title, { color: theme.text }]}>Payment Verification Issue</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.buttonText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.successIcon, { backgroundColor: theme.success + '20' }]}>
        <Ionicons name="checkmark-circle" size={80} color={theme.success} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        Payment Successful!
      </Text>
      
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        Welcome to CoachMeld Pro! You now have unlimited access to all diet coaches and premium features.
      </Text>

      <View style={styles.featuresContainer}>
        <Text style={[styles.featuresTitle, { color: theme.text }]}>
          Your Pro Benefits:
        </Text>
        {[
          'Access to all 6 diet coaches',
          'Unlimited daily messages',
          'Advanced meal planning',
          'Priority support',
          'Export unlimited conversations',
        ].map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons name="checkmark" size={20} color={theme.success} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('MainTabs')}
      >
        <Text style={styles.buttonText}>Start Exploring</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Marketplace')}
      >
        <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
          Browse All Coaches
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});