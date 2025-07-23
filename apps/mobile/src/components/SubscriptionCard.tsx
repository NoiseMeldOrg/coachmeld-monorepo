import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { STRIPE_CONFIG } from '../config/stripe';
import { supabase } from '../lib/supabase';

interface PlanCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  onSubscribe: () => void;
  loading?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  price,
  period,
  features,
  isPopular,
  onSubscribe,
  loading,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: isPopular ? theme.primary : theme.border }]}>
      {isPopular && (
        <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}
      
      <Text style={[styles.planTitle, { color: theme.text }]}>{title}</Text>
      
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: theme.text }]}>{price}</Text>
        <Text style={[styles.period, { color: theme.textSecondary }]}>/{period}</Text>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.subscribeButton,
          { backgroundColor: isPopular ? theme.primary : theme.card, borderColor: theme.primary },
          loading && styles.disabledButton,
        ]}
        onPress={onSubscribe}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={isPopular ? 'white' : theme.primary} />
        ) : (
          <Text style={[styles.subscribeText, { color: isPopular ? 'white' : theme.primary }]}>
            Get Started
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const SubscriptionCard: React.FC = () => {
  const { theme } = useTheme();
  const { subscribeToPlan, hasActiveSubscription, cancelSubscription } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null);

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    setLoadingPlan(planType);
    
    try {
      const result = await subscribeToPlan(planType);
      
      if (!result.success) {
        Alert.alert(
          'Subscription Error',
          result.error || 'Unable to process subscription. Please try again.',
          [{ text: 'OK' }]
        );
      }
      // Success case: web will redirect, mobile will show success in payment sheet
    } catch (error) {
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to all premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelSubscription();
            if (result.success) {
              Alert.alert('Success', 'Your subscription has been cancelled.');
            } else {
              Alert.alert('Error', result.error || 'Unable to cancel subscription.');
            }
          },
        },
      ]
    );
  };

  if (hasActiveSubscription) {
    return (
      <View style={[styles.activeContainer, { backgroundColor: theme.card }]}>
        <View style={styles.activeHeader}>
          <Ionicons name="checkmark-circle" size={32} color={theme.success} />
          <Text style={[styles.activeTitle, { color: theme.text }]}>CoachMeld Pro Active</Text>
        </View>
        
        <Text style={[styles.activeDescription, { color: theme.textSecondary }]}>
          You have unlimited access to all coaches and premium features.
        </Text>

        <TouchableOpacity
          style={[styles.manageButton, { borderColor: theme.border }]}
          onPress={handleCancel}
        >
          <Text style={[styles.manageText, { color: theme.error }]}>Cancel Subscription</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Choose Your Plan</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Unlock all 6 diet coaches and premium features
      </Text>

      <View style={styles.cardsContainer}>
        <PlanCard
          title="Monthly"
          price="$9.99"
          period="month"
          features={[
            'All 6 diet coaches',
            'Unlimited messages',
            'Advanced meal planning',
            'Priority support',
            'Cancel anytime',
          ]}
          onSubscribe={() => handleSubscribe('monthly')}
          loading={loadingPlan === 'monthly'}
        />

        <PlanCard
          title="Annual"
          price="$95.88"
          period="year"
          features={[
            'All 6 diet coaches',
            'Unlimited messages',
            'Advanced meal planning',
            'Priority support',
            'Save 20% ($23.88)',
          ]}
          isPopular
          onSubscribe={() => handleSubscribe('annual')}
          loading={loadingPlan === 'annual'}
        />
      </View>

      <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
        • Subscriptions auto-renew unless cancelled{'\n'}
        • Cancel anytime from your profile{'\n'}
        • Prices in USD
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 18,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disclaimer: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  manageButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  manageText: {
    fontSize: 16,
    fontWeight: '500',
  },
});