import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useCoach } from '../context/SimpleCoachContext';
import { useNavigation } from '@react-navigation/native';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { AuthDebug } from '../components/AuthDebug';

export const SimpleHomeScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { userProfile, isProfileComplete } = useUser();
  const { activeCoach, coaches, switchCoach } = useCoach();
  const navigation = useNavigation<any>();
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const handleAcceptDisclaimer = async () => {
    try {
      await AsyncStorage.setItem('hasSeenDisclaimer', 'true');
      setShowFullDisclaimer(false);
    } catch (error) {
      console.error('Error saving disclaimer status:', error);
    }
  };

  const renderCoachIcon = (coach: any, size: number, color: string) => {
    const iconLibrary = coach.iconLibrary || 'Ionicons';
    
    switch (iconLibrary) {
      case 'MaterialCommunityIcons':
        // Use icon rotation from database
        const rotation = coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {};
        return <MaterialCommunityIcons 
          name={coach.iconName as any} 
          size={size} 
          color={color} 
          style={rotation}
        />;
      case 'Ionicons':
      default:
        return <Ionicons name={coach.iconName as any} size={size} color={color} />;
    }
  };

  const QuickAction = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }], width: '48%' }}>
        <TouchableOpacity 
          style={[styles.quickAction, { backgroundColor: theme.surface }]} 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name={icon as any} size={28} color={theme.primary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Disclaimer Banner at the top */}
      <DisclaimerBanner 
        type="minimal" 
        onPress={() => setShowFullDisclaimer(true)} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Auth Debug - Remove after testing */}
        <AuthDebug />
        {/* Welcome Section */}
        <Animated.View 
          style={[
            styles.welcomeSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={isDark ? ['#2a2a2a', '#1a1a1a'] : ['#f8f9fa', '#ffffff']}
            style={styles.welcomeGradient}
          >
            <Text style={[styles.welcomeText, { color: theme.text }]}>
              Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}!
            </Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              Your health journey continues
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Profile Status */}
        {!isProfileComplete && (
          <TouchableOpacity 
            style={[styles.profileAlert, { backgroundColor: theme.warning + '20' }]}
            onPress={() => navigation.navigate('Profile')}
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
              const canAccess = coach.isFree || coach.hasActiveSubscription;
              
              return (
                <TouchableOpacity
                  key={coach.id}
                  style={[
                    styles.coachCard,
                    {
                      backgroundColor: isActive ? coach.colorTheme?.primary + '20' : theme.surface,
                      borderColor: isActive ? coach.colorTheme?.primary : theme.border,
                      borderWidth: isActive ? 2 : 1,
                      opacity: canAccess ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => {
                    if (canAccess) {
                      switchCoach(coach.id);
                    } else {
                      navigation.navigate('DietSelection');
                    }
                  }}
                >
                  <View style={[styles.coachIcon, { backgroundColor: coach.colorTheme?.primary + '15' }]}>
                    {renderCoachIcon(coach, 32, coach.colorTheme?.primary)}
                  </View>
                  <Text style={[styles.coachName, { color: theme.text }]}>{coach.name}</Text>
                  <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                    {coach.description}
                  </Text>
                  {!coach.isFree && !canAccess && (
                    <View style={[styles.proBadge, { backgroundColor: coach.colorTheme?.primary }]}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                  {coach.isFree && (
                    <View style={[styles.freeBadge, { backgroundColor: '#4CAF50' }]}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Coach Info */}
        {activeCoach && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity 
              style={[styles.activeCoachCard]}
              onPress={() => navigation.navigate('Coach')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[
                  (activeCoach.colorTheme?.primary || theme.primary) + '20',
                  (activeCoach.colorTheme?.primary || theme.primary) + '10'
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeCoachGradient}
              >
                <View style={[styles.activeCoachIconContainer, { backgroundColor: theme.surface }]}>
                  {renderCoachIcon(activeCoach, 32, activeCoach.colorTheme?.primary || theme.primary)}
                </View>
                <View style={styles.activeCoachInfo}>
                  <Text style={[styles.activeCoachLabel, { color: theme.textSecondary }]}>
                    Active Coach
                  </Text>
                  <Text style={[styles.activeCoachName, { color: theme.text }]}>
                    {activeCoach.name}
                  </Text>
                  <Text style={[styles.activeCoachTagline, { color: activeCoach.colorTheme?.primary || theme.primary }]}>
                    Ready to help you succeed
                  </Text>
                </View>
                <Ionicons 
                  name="chevron-forward-circle" 
                  size={32} 
                  color={activeCoach.colorTheme?.primary || theme.primary} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stats Overview */}
        <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: theme.surface }]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B6B20', '#FF6B6B10']}
                style={styles.statGradient}
              >
                <Ionicons name="flame" size={28} color="#FF6B6B" />
                <Text style={[styles.statValue, { color: theme.text }]}>2,340</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Calories</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: theme.surface }]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.primary + '20', theme.primary + '10']}
                style={styles.statGradient}
              >
                <Ionicons name="nutrition" size={28} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>180g</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Protein</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: theme.surface }]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4FC3F720', '#4FC3F710']}
                style={styles.statGradient}
              >
                <Ionicons name="water" size={28} color="#4FC3F7" />
                <Text style={[styles.statValue, { color: theme.text }]}>2.5L</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Water</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

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
              onPress={() => navigation.navigate('Meals')}
            />
            <QuickAction 
              icon="trending-up" 
              title="Track Progress" 
              onPress={() => navigation.navigate('Progress')}
            />
            <QuickAction 
              icon="person" 
              title="My Profile" 
              onPress={() => navigation.navigate('Profile')}
            />
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeGradient: {
    padding: 24,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subText: {
    fontSize: 16,
    letterSpacing: 0.3,
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
    marginHorizontal: 12,
    fontSize: 14,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
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
    alignItems: 'center',
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
    backgroundColor: '#4CAF50',
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeCoachCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  activeCoachGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  activeCoachIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activeCoachInfo: {
    flex: 1,
    marginLeft: 16,
  },
  activeCoachLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeCoachName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  activeCoachTagline: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statGradient: {
    alignItems: 'center',
    padding: 20,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});