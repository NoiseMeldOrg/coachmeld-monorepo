import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { Ionicons } from '@expo/vector-icons';

export const SubscriptionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { remainingFreeMessages, hasActiveSubscription } = useSubscription();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {!hasActiveSubscription && remainingFreeMessages >= 0 && (
          <View style={[styles.messageAlert, { backgroundColor: theme.warning + '20' }]}>
            <Ionicons name="information-circle" size={24} color={theme.warning} />
            <View style={styles.messageInfo}>
              <Text style={[styles.messageTitle, { color: theme.text }]}>
                Free Tier Limit
              </Text>
              <Text style={[styles.messageText, { color: theme.textSecondary }]}>
                You have {remainingFreeMessages} free messages remaining today.
                Upgrade to Pro for unlimited access!
              </Text>
            </View>
          </View>
        )}

        <SubscriptionCard />

        <View style={styles.benefitsSection}>
          <Text style={[styles.benefitsTitle, { color: theme.text }]}>
            Why Upgrade to Pro?
          </Text>

          {[
            {
              icon: 'people',
              title: 'All 6 Diet Coaches',
              description: 'Access Carnivore, Paleo, Keto, Ketovore, Low Carb, and Lion Diet coaches',
            },
            {
              icon: 'infinite',
              title: 'Unlimited Messages',
              description: 'No daily limits - chat as much as you need',
            },
            {
              icon: 'restaurant',
              title: 'Advanced Meal Planning',
              description: 'Personalized meal plans, shopping lists, and recipes',
            },
            {
              icon: 'flash',
              title: 'Priority Support',
              description: 'Faster response times and priority customer support',
            },
            {
              icon: 'analytics',
              title: 'Premium Features',
              description: 'Access to all future premium features as they launch',
            },
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name={benefit.icon as any} size={24} color={theme.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: theme.text }]}>
                  {benefit.title}
                </Text>
                <Text style={[styles.benefitDescription, { color: theme.textSecondary }]}>
                  {benefit.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.faqSection}>
          <Text style={[styles.faqTitle, { color: theme.text }]}>
            Frequently Asked Questions
          </Text>

          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards, debit cards, and digital wallets like Apple Pay and Google Pay.',
            },
            {
              q: 'Is my payment information secure?',
              a: 'Absolutely. All payments are processed securely through Stripe. We never store your card details.',
            },
            {
              q: 'What happens to my data if I cancel?',
              a: 'Your data remains safe and accessible. You can resubscribe anytime to regain full access.',
            },
          ].map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.q}</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{faq.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageAlert: {
    flexDirection: 'row',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  messageInfo: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  benefitsSection: {
    padding: 20,
  },
  benefitsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  faqSection: {
    padding: 20,
    paddingBottom: 40,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
});