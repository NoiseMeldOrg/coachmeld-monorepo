import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCoach } from '../context/CoachContext';
import { useSubscription } from '../context/SubscriptionContext';
import { CoachCard } from '../components/coaches/CoachCard';
import { useNavigation } from '@react-navigation/native';
import { TestPaymentModal } from '../components/TestPaymentModal';
import { isCoachFreeAccess } from '../utils/coachDisplay';
import { logger } from '../../../../packages/shared-utils/src/logger';

export const CoachMarketplaceScreen: React.FC = () => {
  const { theme } = useTheme();
  const { coaches, canAccessCoach, switchCoach, isTestUser, refreshCoaches } = useCoach();
  const { createTestSubscription } = useSubscription();
  const navigation = useNavigation<any>();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showTestPayment, setShowTestPayment] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // Get or create scale animation for a card
  const getScaleAnim = (cardId: string) => {
    if (!scaleAnims[cardId]) {
      scaleAnims[cardId] = new Animated.Value(1);
    }
    return scaleAnims[cardId];
  };

  const animateCardPress = (cardId: string, onComplete?: () => void) => {
    const scaleAnim = getScaleAnim(cardId);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(onComplete);
  };

  // Special handling for carnivore coach - show limited version in free section
  const carnivoreCoach = coaches.find(c => c.freeTierEnabled && c.coachType === 'carnivore');
  const freeCoaches = coaches.filter(c => isCoachFreeAccess(c));
  const premiumCoaches = coaches.filter(c => !isCoachFreeAccess(c));

  const handleCoachPress = async (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return;

    logger.debug('Coach press interaction', { 
      coachId, 
      isTestUser, 
      canAccess: canAccessCoach(coachId) 
    });

    if (canAccessCoach(coachId)) {
      await switchCoach(coachId);
      navigation.navigate('Coach');
    } else {
      // For test users, show test payment modal
      if (isTestUser) {
        logger.debug('Showing test payment modal', { coachName: coach.name });
        setSelectedCoach(coach);
        setShowTestPayment(true);
      } else {
        // TODO: Navigate to Stripe checkout
        Alert.alert(
          'Payment Integration Coming Soon',
          'Stripe payment integration will be available in the next update.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Coach Marketplace</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose your AI health coaches
          </Text>
        </View>

        {isTestUser && (
          <View style={[styles.testBanner, { backgroundColor: theme.warning + '20' }]}>
            <Ionicons name="flask" size={20} color={theme.warning} />
            <Text style={[styles.testText, { color: theme.text }]}>
              Test Mode: Test payments enabled for coach subscriptions
            </Text>
          </View>
        )}

        {/* All Coaches in Order */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Coaches</Text>
          
          {/* First: Limited Carnivore Coach (only show if user doesn't have pro subscription) */}
          {carnivoreCoach && carnivoreCoach.freeTierEnabled && !carnivoreCoach.hasActiveSubscription && (
            <View style={styles.limitedCoachWrapper}>
              <CoachCard
                coach={{
                  ...carnivoreCoach,
                  name: 'Carnivore Coach',
                  description: 'Basic meat-based diet guidance',
                  features: carnivoreCoach.freeTierFeatures || carnivoreCoach.features.slice(0, 2),
                  isFree: false, // This ensures it shows LIMITED badge
                  freeTierEnabled: true,
                  hasActiveSubscription: false,
                }}
                onPress={async () => {
                  // Just switch to the limited coach, don't navigate away
                  await switchCoach(carnivoreCoach.id);
                }}
                isActive={false}
                customBorderColor={carnivoreCoach.colorTheme.primary}
                customBorderWidth={2}
              />
            </View>
          )}
          
          {/* Second: Carnivore Coach Pro */}
          {carnivoreCoach && (
            <View>
              <CoachCard
                coach={carnivoreCoach}
                onPress={() => {
                  // For pro version, always check subscription status
                  if (!carnivoreCoach.hasActiveSubscription) {
                    // Show test payment modal
                    if (isTestUser) {
                      logger.debug('Showing test payment modal for carnivore pro', { 
                        coachName: carnivoreCoach.name 
                      });
                      setSelectedCoach(carnivoreCoach);
                      setShowTestPayment(true);
                    } else {
                      Alert.alert(
                        'Payment Integration Coming Soon',
                        'Stripe payment integration will be available in the next update.',
                        [{ text: 'OK' }]
                      );
                    }
                  } else {
                    // User has subscription, switch to coach
                    switchCoach(carnivoreCoach.id);
                  }
                }}
                isActive={carnivoreCoach.hasActiveSubscription}
              />
              {subscribing === carnivoreCoach.id && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              )}
            </View>
          )}
          
          {/* Rest of the premium coaches */}
          {coaches
            .filter(c => c.coachType !== 'carnivore' && !c.isFree)
            .map(coach => (
              <View key={coach.id}>
                <CoachCard
                  coach={coach}
                  onPress={() => handleCoachPress(coach.id)}
                  isActive={coach.hasActiveSubscription}
                />
                {subscribing === coach.id && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={theme.primary} />
                  </View>
                )}
              </View>
            ))
          }
        </View>

        {/* Bundle Offer */}
        <TouchableOpacity 
          style={[styles.bundleCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
          onPress={() => {
            if (isTestUser) {
              setSelectedCoach({
                id: 'bundle_all_access',
                name: 'All Access Bundle',
                monthlyPrice: 29.99,
              });
              setShowTestPayment(true);
            } else {
              Alert.alert(
                'Bundle Coming Soon',
                'Bundle subscriptions will be available in the next update.',
                [{ text: 'OK' }]
              );
            }
          }}
        >
          <View style={styles.bundleHeader}>
            <Ionicons name="gift" size={32} color={theme.primary} />
            <View style={styles.bundleInfo}>
              <Text style={[styles.bundleTitle, { color: theme.text }]}>
                All Access Bundle
              </Text>
              <Text style={[styles.bundlePrice, { color: theme.primary }]}>
                $29.99/month
              </Text>
            </View>
            <View style={[styles.bundleBadge, { backgroundColor: theme.success }]}>
              <Text style={styles.bundleBadgeText}>SAVE 40%</Text>
            </View>
          </View>
          <Text style={[styles.bundleDescription, { color: theme.textSecondary }]}>
            Get access to all premium coaches and future additions
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Test Payment Modal */}
      {selectedCoach && (
        <TestPaymentModal
          visible={showTestPayment}
          onClose={() => {
            setShowTestPayment(false);
            setSelectedCoach(null);
          }}
          onSuccess={async (subscriptionId) => {
            // Refresh coaches to show new subscription
            await refreshCoaches();
            // Switch to the coach after successful payment
            await switchCoach(selectedCoach.id);
            // Try to navigate to the Coach tab if we're in the tab navigator
            if (navigation.getParent()) {
              navigation.getParent()?.navigate('Coach');
            } else {
              // Otherwise just go back
              navigation.goBack();
            }
          }}
          planId={selectedCoach.id}
          planName={selectedCoach.name}
          price={`$${selectedCoach.monthlyPrice}/month`}
          coachId={selectedCoach.id}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  testText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  bundleCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bundleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bundleTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bundlePrice: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  bundleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bundleBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  bundleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  limitedCoachWrapper: {
    // Just a wrapper for the limited coach card
  },
});