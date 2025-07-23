import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useCoach } from '../context/CoachContext';
import { useNavigation } from '@react-navigation/native';
import { dietCoaches } from '../data/dietCoaches';
import { TestPaymentModal } from '../components/TestPaymentModal';
import { getCoachDisplayName, getCoachFeatures, isCoachFreeAccess, getCoachBadgeText, getCoachBadgeColor } from '../utils/coachDisplay';

const { width: screenWidth } = Dimensions.get('window');

export const DietSelectionScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { activeCoach, switchCoach, canAccessCoach, isTestUser, coaches, refreshCoaches } = useCoach();
  const navigation = useNavigation<any>();
  const [selectedDietId, setSelectedDietId] = useState(activeCoach?.id || 'carnivore');
  const [showTestPayment, setShowTestPayment] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [pressedCardId, setPressedCardId] = useState<string | null>(null);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Get or create scale animation for a card
  const getScaleAnim = (cardId: string) => {
    if (!scaleAnims[cardId]) {
      scaleAnims[cardId] = new Animated.Value(1);
    }
    return scaleAnims[cardId];
  };
  
  // Use coaches from context if available, fallback to static data
  const availableCoaches = coaches.length > 0 ? coaches : dietCoaches;
  
  console.log('DietSelectionScreen - coaches from context:', coaches.length, 'isTestUser:', isTestUser);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const animateCardPress = (cardId: string) => {
    const scaleAnim = getScaleAnim(cardId);
    setPressedCardId(cardId);
    
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
    ]).start(() => {
      setPressedCardId(null);
    });
  };

  const handleDietSelect = (dietId: string, cardKey?: string) => {
    const coach = availableCoaches.find(c => c.id === dietId);
    if (!coach) return;

    console.log('Diet select - isTestUser:', isTestUser, 'canAccess:', canAccessCoach(dietId), 'coach:', coach.name);

    // Animate the specific card
    if (cardKey) {
      animateCardPress(cardKey);
    }

    // Special handling for Carnivore Coach Pro - when user clicks the pro card, 
    // treat it as a premium coach requiring payment
    const isCarnivorePro = coach.coachType === 'carnivore' && coach.freeTierEnabled && coach.name.includes('Pro');
    const hasAccess = isCarnivorePro 
      ? coach.hasActiveSubscription 
      : (coach.isFree || canAccessCoach(dietId));

    if (hasAccess) {
      setSelectedDietId(dietId);
      // Automatically switch to the coach and go back
      switchCoach(dietId);
      navigation.goBack();
    } else {
      // For test users, show test payment modal
      if (isTestUser) {
        console.log('Showing test payment modal for diet coach:', coach.name);
        setSelectedCoach(coach);
        setShowTestPayment(true);
      } else {
        // For regular users, show upgrade prompt
        Alert.alert(
          '🌟 Upgrade to CoachMeld Pro',
          `Unlock ${coach.name} and all premium coaches for just $29.99/month:\n\n✓ All 6 specialized diet coaches\n✓ Unlimited messages\n✓ Advanced meal planning\n✓ Priority support`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { 
              text: 'Upgrade Now →', 
              onPress: () => {
                Alert.alert('Coming Soon! 🚀', 'Stripe payment integration will be available in the next update.');
              }
            },
          ],
          { cancelable: true }
        );
      }
    }
  };


  const renderIcon = (coach: any) => {
    if (coach.iconLibrary === 'MaterialCommunityIcons') {
      return (
        <MaterialCommunityIcons 
          name={coach.iconName as any} 
          size={32} 
          color={coach.colorTheme.primary} 
          style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
        />
      );
    }
    return (
      <Ionicons 
        name={coach.iconName as any} 
        size={32} 
        color={coach.colorTheme.primary} 
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.innerContainer}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Choose Your Diet Coach
          </Text>
          <View style={{ width: 40 }} />
        </View>

      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim }]} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Select a diet approach that matches your health goals
          </Text>
          <TouchableOpacity
            style={styles.promoCard}
            onPress={() => {
              Alert.alert(
                '🌟 Upgrade to CoachMeld Pro',
                `Unlock all diet coaches and premium features for just $29.99/month:\n\n✓ All 6 specialized diet coaches\n✓ Unlimited messages\n✓ Advanced meal planning\n✓ Priority support`,
                [
                  { text: 'Maybe Later', style: 'cancel' },
                  { 
                    text: 'Upgrade Now →', 
                    onPress: () => {
                      Alert.alert('Coming Soon! 🚀', 'Pro subscriptions will be available in the next update. Stay tuned!');
                    }
                  },
                ],
                { cancelable: true }
              );
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.promoGradient}
            >
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={styles.promoText}>
                Get all full featured AI diet coaches with Pro • $29.99/mo
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* First show limited Carnivore Coach if it exists and user doesn't have pro */}
        {availableCoaches.find(c => c.freeTierEnabled && c.coachType === 'carnivore' && !c.hasActiveSubscription) && (() => {
          const carnivoreCoach = availableCoaches.find(c => c.freeTierEnabled && c.coachType === 'carnivore')!;
          const isSelected = selectedDietId === carnivoreCoach.id && !carnivoreCoach.hasActiveSubscription;
          
          const limitedCardKey = `${carnivoreCoach.id}-limited`;
          return (
            <Animated.View
              key={limitedCardKey}
              style={[
                { transform: [{ scale: getScaleAnim(limitedCardKey) }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.coachCard,
                  { 
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? carnivoreCoach.colorTheme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                  isSelected && styles.selectedCard,
                ]}
                onPress={() => {
                  // Limited version - just switch coach, no navigation
                  animateCardPress(limitedCardKey);
                  setSelectedDietId(carnivoreCoach.id);
                  switchCoach(carnivoreCoach.id);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.coachHeader}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: carnivoreCoach.colorTheme.secondary }
                  ]}>
                    {renderIcon(carnivoreCoach)}
                  </View>
                  <View style={styles.coachInfo}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.coachName, { color: theme.text }]}>
                        Carnivore Coach
                      </Text>
                    </View>
                    <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                      Basic meat-based diet guidance
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={carnivoreCoach.colorTheme.primary} 
                    />
                  )}
                </View>
                
                <View style={styles.features}>
                  {(carnivoreCoach.freeTierFeatures || carnivoreCoach.features.slice(0, 2)).map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons 
                        name="checkmark" 
                        size={16} 
                        color={carnivoreCoach.colorTheme.primary} 
                      />
                      <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.freeBadge, { backgroundColor: theme.warning }]}>
                  <Text style={styles.freeBadgeText}>LIMITED</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })()}

        {/* Then show all coaches in order */}
        {availableCoaches.map((coach, index) => {
          const isSelected = selectedDietId === coach.id;
          // For carnivore coach when shown as "Pro", only consider it accessible if user has subscription
          const isAccessible = coach.coachType === 'carnivore' && coach.freeTierEnabled 
            ? coach.hasActiveSubscription 
            : (coach.isFree || canAccessCoach(coach.id));
          
          return (
            <Animated.View
              key={coach.id}
              style={[
                { transform: [{ scale: getScaleAnim(coach.id) }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.coachCard,
                  { 
                    backgroundColor: theme.surface,
                    borderColor: isSelected && isAccessible ? coach.colorTheme.primary : theme.border,
                    borderWidth: isSelected && isAccessible ? 2 : 1,
                    opacity: isAccessible ? 1 : 0.85,
                  },
                  isSelected && isAccessible && styles.selectedCard,
                ]}
                onPress={() => handleDietSelect(coach.id, coach.id)}
                activeOpacity={0.7}
              >
              <View style={styles.coachHeader}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: coach.colorTheme.secondary }
                ]}>
                  {renderIcon(coach)}
                </View>
                <View style={styles.coachInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.coachName, { color: theme.text }]}>
                      {getCoachDisplayName(coach)}
                    </Text>
                    {(() => {
                      const badgeText = getCoachBadgeText(coach);
                      const badgeColor = getCoachBadgeColor(coach, theme);
                      if (badgeText && badgeText !== 'FREE') {
                        return (
                          <View style={[styles.proBadge, { backgroundColor: badgeColor }]}>
                            <Text style={styles.proBadgeText}>{badgeText}</Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                  <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                    {coach.description}
                  </Text>
                </View>
                {isSelected && isAccessible && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={coach.colorTheme.primary} 
                  />
                )}
              </View>
              
              <View style={styles.features}>
                {/* For carnivore pro card, always show full features, not limited ones */}
                {(coach.coachType === 'carnivore' && coach.freeTierEnabled ? coach.features : getCoachFeatures(coach)).map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons 
                      name="checkmark" 
                      size={16} 
                      color={coach.colorTheme.primary} 
                    />
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {!isAccessible && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={24} color={theme.textSecondary} />
                </View>
              )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      </View>
      
      {showTestPayment && selectedCoach && (
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
            navigation.goBack();
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
  innerContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 32,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  headerContent: {
    marginTop: 10,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  promoCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  promoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  promoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  coachCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedCard: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  coachDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  features: {
    marginTop: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  freeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});