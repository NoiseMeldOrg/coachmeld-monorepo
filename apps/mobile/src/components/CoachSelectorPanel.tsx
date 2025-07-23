import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Coach } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCoachDisplayName, getCoachBadgeText, isCoachAvailable } from '../utils/coachDisplay';

interface CoachSelectorPanelProps {
  visible: boolean;
  onClose: () => void;
  coaches: Coach[];
  activeCoach: Coach | null;
  onSelectCoach: (coach: Coach) => void;
  hasActiveSubscription: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CoachSelectorPanel: React.FC<CoachSelectorPanelProps> = ({
  visible,
  onClose,
  coaches,
  activeCoach,
  onSelectCoach,
  hasActiveSubscription,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Create pan responder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
          // Calculate opacity based on panel position (1 at top, 0 at bottom)
          const opacity = 1 - (gestureState.dy / (SCREEN_HEIGHT * 0.7));
          backdropOpacity.setValue(Math.max(0, opacity));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 50 pixels or with enough velocity, close
        if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          Animated.parallel([
            Animated.timing(panY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            panY.setValue(0);
            backdropOpacity.setValue(0);
            onClose();
          });
        } else {
          // Otherwise, snap back
          Animated.parallel([
            Animated.spring(panY, {
              toValue: 0,
              bounciness: 10,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleSelectCoach = (coach: Coach) => {
    onSelectCoach(coach);
    animateClose();
  };

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Separate coaches into categories
  const availableCoaches = coaches.filter(coach => 
    isCoachAvailable(coach, hasActiveSubscription)
  );
  const unavailableCoaches = coaches.filter(coach => 
    !isCoachAvailable(coach, hasActiveSubscription)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1}
          onPress={animateClose}
        >
        <Animated.View 
          style={[
            styles.panel,
            {
              backgroundColor: theme.surface,
              transform: [
                {
                  translateY: Animated.add(slideAnim, panY),
                },
              ],
              paddingBottom: insets.bottom + 20,
            }
          ]}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Handle bar with pan responder */}
            <View style={styles.handleContainer} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Available Coaches */}
              {availableCoaches.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    Your Coaches
                  </Text>
                  {availableCoaches.map((coach) => (
                    <TouchableOpacity
                      key={coach.id}
                      style={[
                        styles.coachItem,
                        activeCoach?.id === coach.id && styles.activeCoachItem,
                        { backgroundColor: theme.background }
                      ]}
                      onPress={() => handleSelectCoach(coach)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.coachItemLeft}>
                        <View style={[
                          styles.coachIcon,
                          { backgroundColor: coach.colorTheme.primary + '20' }
                        ]}>
                          {coach.iconLibrary === 'MaterialCommunityIcons' ? (
                            <MaterialCommunityIcons
                              name={coach.iconName as any}
                              size={24}
                              color={coach.colorTheme.primary}
                              style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
                            />
                          ) : (
                            <Ionicons
                              name={coach.iconName as any}
                              size={24}
                              color={coach.colorTheme.primary}
                            />
                          )}
                        </View>
                        <View style={styles.coachInfo}>
                          <Text style={[styles.coachName, { color: theme.text }]}>
                            {getCoachDisplayName(coach)}
                          </Text>
                          <Text style={[styles.coachDescription, { color: theme.textSecondary }]}>
                            {coach.description}
                          </Text>
                        </View>
                      </View>
                      {activeCoach?.id === coach.id && (
                        <Ionicons name="checkmark" size={24} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Unavailable Coaches */}
              {unavailableCoaches.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    More Coaches
                  </Text>
                  {unavailableCoaches.map((coach) => {
                    const badgeText = getCoachBadgeText(coach, hasActiveSubscription);
                    return (
                      <TouchableOpacity
                        key={coach.id}
                        style={[
                          styles.coachItem,
                          styles.unavailableCoachItem,
                          { backgroundColor: theme.background }
                        ]}
                        onPress={() => {}}
                        activeOpacity={0.5}
                        disabled
                      >
                        <View style={styles.coachItemLeft}>
                          <View style={[
                            styles.coachIcon,
                            { backgroundColor: theme.border, opacity: 0.5 }
                          ]}>
                            {coach.iconLibrary === 'MaterialCommunityIcons' ? (
                              <MaterialCommunityIcons
                                name={coach.iconName as any}
                                size={24}
                                color={theme.textSecondary}
                                style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
                              />
                            ) : (
                              <Ionicons
                                name={coach.iconName as any}
                                size={24}
                                color={theme.textSecondary}
                              />
                            )}
                          </View>
                          <View style={styles.coachInfo}>
                            <Text style={[styles.coachName, { color: theme.textSecondary, opacity: 0.7 }]}>
                              {coach.name}
                            </Text>
                            <Text style={[styles.coachDescription, { color: theme.textSecondary, opacity: 0.5 }]}>
                              {badgeText}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.7,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  coachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  activeCoachItem: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  unavailableCoachItem: {
    opacity: 0.6,
  },
  coachItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  coachDescription: {
    fontSize: 14,
  },
});