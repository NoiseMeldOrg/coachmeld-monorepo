import React, { useState, useEffect, Fragment, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useCoach } from '../context/CoachContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { getCoachDisplayName, isCoachFreeAccess } from '../utils/coachDisplay';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { userProfile, isProfileComplete } = useUser();
  const { activeCoach, coaches, switchCoach, canAccessCoach } = useCoach();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);
  const [maxCardHeight, setMaxCardHeight] = useState<number>(0);
  const [cardHeights, setCardHeights] = useState<{ [key: string]: number }>({});
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

  // Check if this is the first launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeenDisclaimer = await AsyncStorage.getItem('hasSeenDisclaimer');
        if (!hasSeenDisclaimer) {
          setShowFullDisclaimer(true);
        }
      } catch (error) {
        console.error('Error checking first launch:', error);
      }
    };
    
    checkFirstLaunch();
  }, []);

  // Calculate max height when card heights change
  useEffect(() => {
    const heights = Object.values(cardHeights);
    if (heights.length > 0) {
      const max = Math.max(...heights);
      setMaxCardHeight(max);
    }
  }, [cardHeights]);

  const handleCardLayout = (cardId: string, event: any) => {
    const { height } = event.nativeEvent.layout;
    setCardHeights(prev => ({
      ...prev,
      [cardId]: height
    }));
  };

  const handleAcceptDisclaimer = async () => {
    try {
      await AsyncStorage.setItem('hasSeenDisclaimer', 'true');
      setShowFullDisclaimer(false);
    } catch (error) {
      console.error('Error saving disclaimer status:', error);
    }
  };

  const QuickAction = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: theme.surface }]} onPress={onPress}>
      <Ionicons name={icon as any} size={32} color={theme.primary} />
      <Text style={[styles.quickActionText, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Disclaimer Banner at the top */}
      <DisclaimerBanner 
        type="minimal" 
        onPress={() => setShowFullDisclaimer(true)} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}!
          </Text>
          <Text style={[styles.subText, { color: theme.textSecondary }]}>
            Your health journey continues
          </Text>
        </View>

        {/* Profile Status */}
        {!isProfileComplete && (
          <TouchableOpacity 
            style={[styles.profileAlert, { backgroundColor: theme.warning + '20' }]}
            onPress={() => navigation.navigate('Profile' as any)}
          >
            <Ionicons name="alert-circle" size={24} color={theme.warning} />
            <Text style={[styles.alertText, { color: theme.text }]}>
              Complete your profile to get personalized advice
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Coach Selector */}
        <View style={styles.coachSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Diet Coach</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('DietSelection')}
              style={[styles.changeDietButton, { backgroundColor: theme.primary + '20' }]}
            >
              <Text style={[styles.changeDietText, { color: theme.primary }]}>Change Diet</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {coaches.map((coach) => {
              const isActive = activeCoach?.id === coach.id;
              const hasAccess = canAccessCoach(coach.id);
              
              // For carnivore coach with free tier, show both limited and pro versions
              if (coach.freeTierEnabled && coach.coachType === 'carnivore') {
                return (
                  <React.Fragment key={coach.id}>
                    {/* Limited version */}
                    <Animated.View style={{ transform: [{ scale: getScaleAnim(`${coach.id}-limited`) }] }}>
                      <View
                        style={[
                          styles.coachCard,
                          {
                            backgroundColor: isActive && !coach.hasActiveSubscription ? coach.colorTheme?.primary + '20' : theme.surface,
                            borderColor: isActive && !coach.hasActiveSubscription ? coach.colorTheme?.primary : theme.border,
                            borderWidth: isActive && !coach.hasActiveSubscription ? 2 : 1,
                            height: maxCardHeight > 0 ? maxCardHeight : undefined,
                          },
                        ]}
                        onLayout={(e) => handleCardLayout(`${coach.id}-limited`, e)}
                      >
                        <TouchableOpacity
                          style={styles.coachCardContent}
                          onPress={() => {
                            animateCardPress(`${coach.id}-limited`, () => {
                              if (!coach.hasActiveSubscription) {
                                switchCoach(coach.id);
                              }
                            });
                          }}
                        >
                      <View style={[styles.coachIcon, { backgroundColor: coach.colorTheme?.primary + '15' }]}>
                        {coach.iconLibrary === 'MaterialCommunityIcons' ? (
                          <MaterialCommunityIcons 
                            name={coach.iconName as any} 
                            size={32} 
                            color={coach.colorTheme?.primary}
                            style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
                          />
                        ) : (
                          <Ionicons 
                            name={coach.iconName as any} 
                            size={32} 
                            color={coach.colorTheme?.primary} 
                          />
                        )}
                      </View>
                      <Text style={[styles.coachName, { color: theme.text }]}>Carnivore Coach</Text>
                      <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                        Basic meat-based diet guidance
                      </Text>
                      <View style={[styles.freeBadge, { backgroundColor: theme.warning }]}>
                        <Text style={styles.freeBadgeText}>LIMITED</Text>
                      </View>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                    
                    {/* Pro version */}
                    <Animated.View style={{ transform: [{ scale: getScaleAnim(`${coach.id}-pro`) }] }}>
                      <View
                        style={[
                          styles.coachCard,
                          {
                            backgroundColor: isActive && coach.hasActiveSubscription ? coach.colorTheme?.primary + '20' : theme.surface,
                            borderColor: isActive && coach.hasActiveSubscription ? coach.colorTheme?.primary : theme.border,
                            borderWidth: isActive && coach.hasActiveSubscription ? 2 : 1,
                            opacity: coach.hasActiveSubscription ? 1 : 0.6,
                            height: maxCardHeight > 0 ? maxCardHeight : undefined,
                          },
                        ]}
                        onLayout={(e) => handleCardLayout(`${coach.id}-pro`, e)}
                      >
                        <TouchableOpacity
                          style={styles.coachCardContent}
                          onPress={() => {
                            animateCardPress(`${coach.id}-pro`, () => {
                              if (coach.hasActiveSubscription) {
                                switchCoach(coach.id);
                              } else {
                                navigation.navigate('Marketplace');
                              }
                            });
                          }}
                        >
                      <View style={[styles.coachIcon, { backgroundColor: coach.colorTheme?.primary + '15' }]}>
                        {coach.iconLibrary === 'MaterialCommunityIcons' ? (
                          <MaterialCommunityIcons 
                            name={coach.iconName as any} 
                            size={32} 
                            color={coach.colorTheme?.primary}
                            style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
                          />
                        ) : (
                          <Ionicons 
                            name={coach.iconName as any} 
                            size={32} 
                            color={coach.colorTheme?.primary} 
                          />
                        )}
                      </View>
                      <Text style={[styles.coachName, { color: theme.text }]}>{coach.name}</Text>
                      <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                        {coach.description}
                      </Text>
                      {!coach.hasActiveSubscription && (
                        <View style={[styles.proBadge, { backgroundColor: coach.colorTheme?.primary }]}>
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      )}
                      {coach.hasActiveSubscription && (
                        <View style={[styles.activeBadge, { backgroundColor: coach.colorTheme?.primary }]}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  </React.Fragment>
                );
              }
              
              return (
                <Animated.View key={coach.id} style={{ transform: [{ scale: getScaleAnim(coach.id) }] }}>
                  <View
                    style={[
                      styles.coachCard,
                      {
                        backgroundColor: isActive ? coach.colorTheme?.primary + '20' : theme.surface,
                        borderColor: isActive ? coach.colorTheme?.primary : theme.border,
                        borderWidth: isActive ? 2 : 1,
                        opacity: hasAccess ? 1 : 0.6,
                        height: maxCardHeight > 0 ? maxCardHeight : undefined,
                      },
                    ]}
                    onLayout={(e) => handleCardLayout(coach.id, e)}
                  >
                    <TouchableOpacity
                      style={styles.coachCardContent}
                      onPress={() => {
                        animateCardPress(coach.id, () => {
                          if (hasAccess) {
                            switchCoach(coach.id);
                          } else {
                            navigation.navigate('Marketplace');
                          }
                        });
                      }}
                    >
                  <View style={[styles.coachIcon, { backgroundColor: coach.colorTheme?.primary + '15' }]}>
                    {coach.iconLibrary === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons 
                        name={coach.iconName as any} 
                        size={32} 
                        color={coach.colorTheme?.primary}
                        style={coach.coachType === 'carnivore' ? { transform: [{ rotate: '-90deg' }] } : {}}
                      />
                    ) : (
                      <Ionicons 
                        name={coach.iconName as any} 
                        size={32} 
                        color={coach.colorTheme?.primary} 
                      />
                    )}
                  </View>
                  <Text style={[styles.coachName, { color: theme.text }]}>{getCoachDisplayName(coach)}</Text>
                  <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                    {coach.description}
                  </Text>
                  {!coach.isFree && !hasAccess && (
                    <View style={[styles.proBadge, { backgroundColor: coach.colorTheme?.primary }]}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                  {isCoachFreeAccess(coach) && (
                    <View style={[styles.freeBadge, { backgroundColor: coach.freeTierEnabled && !coach.hasActiveSubscription ? theme.warning : '#4CAF50' }]}>
                      <Text style={styles.freeBadgeText}>{coach.freeTierEnabled && !coach.hasActiveSubscription ? 'LIMITED' : 'FREE'}</Text>
                    </View>
                  )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Coach Info */}
        {activeCoach && (
          <TouchableOpacity 
            style={[styles.activeCoachCard, { backgroundColor: activeCoach.colorTheme.primary + '15' }]}
            onPress={() => navigation.navigate('Coach')}
          >
            {activeCoach.iconLibrary === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons 
                name={activeCoach.iconName as any} 
                size={36} 
                color={activeCoach.colorTheme.primary}
                style={activeCoach.iconRotation ? { transform: [{ rotate: `${activeCoach.iconRotation}deg` }] } : {}}
              />
            ) : (
              <Ionicons 
                name={activeCoach.iconName as any} 
                size={32} 
                color={activeCoach.colorTheme.primary} 
              />
            )}
            <View style={styles.activeCoachInfo}>
              <Text style={[styles.activeCoachLabel, { color: theme.textSecondary }]}>
                Active Coach
              </Text>
              <Text style={[styles.activeCoachName, { color: theme.text }]}>
                {getCoachDisplayName(activeCoach)}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={activeCoach.colorTheme.primary} 
            />
          </TouchableOpacity>
        )}

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="flame" size={28} color={theme.error} />
              <Text style={[styles.statValue, { color: theme.text }]}>2,340</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Calories</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="nutrition" size={28} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]}>180g</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Protein</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="water" size={28} color={theme.secondary} />
              <Text style={[styles.statValue, { color: theme.text }]}>2.5L</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Water</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="chatbubbles" 
              title="Ask Coach" 
              onPress={() => navigation.navigate('Coach')}
            />
            <QuickAction 
              icon="restaurant" 
              title="Meal Plans" 
              onPress={() => navigation.navigate('Meals' as any)}
            />
            <QuickAction 
              icon="people" 
              title="Coaches" 
              onPress={() => navigation.navigate('Marketplace')}
            />
            <QuickAction 
              icon="settings" 
              title="Settings" 
              onPress={() => navigation.navigate('Profile' as any)}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
          <View style={[styles.activityCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>
                Daily Check-in Complete
              </Text>
              <Text style={[styles.activityTime, { color: theme.textSecondary }]}>
                2 hours ago
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Full Disclaimer Modal */}
      <MedicalDisclaimer 
        visible={showFullDisclaimer}
        onAccept={handleAcceptDisclaimer}
        onDecline={() => setShowFullDisclaimer(false)}
        coachType="general"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  coachSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeDietButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeDietText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coachCard: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  coachCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  coachIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  coachDescription: {
    fontSize: 12,
    textAlign: 'center',
    minHeight: 32,
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  freeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    fontSize: 16,
  },
  profileAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  activeCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  activeCoachInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activeCoachLabel: {
    fontSize: 12,
  },
  activeCoachName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  quickAction: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  quickActionText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  activitySection: {
    marginBottom: 32,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 14,
    marginTop: 2,
  },
});