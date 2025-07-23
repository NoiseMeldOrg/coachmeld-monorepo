import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Coach } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { getCoachDisplayName, getCoachBadgeText, getCoachBadgeColor } from '../../utils/coachDisplay';

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
  isActive?: boolean;
  compact?: boolean;
  customBorderColor?: string;
  customBorderWidth?: number;
}

export const CoachCard: React.FC<CoachCardProps> = ({ 
  coach, 
  onPress, 
  isActive = false,
  compact = false,
  customBorderColor,
  customBorderWidth
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const displayName = getCoachDisplayName(coach);
  const badgeText = getCoachBadgeText(coach);
  const badgeColor = getCoachBadgeColor(coach, theme);
  const cardColor = isActive ? coach.colorTheme.primary : theme.surface;
  const textColor = isActive ? '#ffffff' : theme.text;

  const animatePress = () => {
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
      onPress();
    });
  };

  // No longer need to check for carnivore coach - use iconRotation from database

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactCard,
          { 
            backgroundColor: isActive ? coach.colorTheme.primary : theme.surface,
            borderColor: isActive ? coach.colorTheme.secondary : theme.border,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {coach.iconLibrary === 'MaterialCommunityIcons' ? (
          <MaterialCommunityIcons 
            name={coach.iconName as any} 
            size={24} 
            color={isActive ? '#ffffff' : coach.colorTheme.primary}
            style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
          />
        ) : (
          <Ionicons 
            name={coach.iconName as any} 
            size={24} 
            color={isActive ? '#ffffff' : coach.colorTheme.primary} 
          />
        )}
        <Text 
          style={[
            styles.compactName, 
            { color: isActive ? '#ffffff' : theme.text }
          ]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {!coach.hasActiveSubscription && !coach.isFree && (
          <Ionicons name="lock-closed" size={16} color={theme.textSecondary} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          { 
            backgroundColor: theme.surface,
            borderColor: customBorderColor || (isActive ? coach.colorTheme.primary : theme.border),
            borderWidth: customBorderWidth || (isActive ? 2 : 1),
          }
        ]}
        onPress={animatePress}
        activeOpacity={0.8}
      >
      <View style={[styles.iconContainer, { backgroundColor: coach.colorTheme.primary + '20' }]}>
        {coach.iconLibrary === 'MaterialCommunityIcons' ? (
          <MaterialCommunityIcons 
            name={coach.iconName as any} 
            size={36} 
            color={coach.colorTheme.primary}
            style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
          />
        ) : (
          <Ionicons 
            name={coach.iconName as any} 
            size={32} 
            color={coach.colorTheme.primary} 
          />
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
          {badgeText ? (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : (
            <Text style={[styles.price, { color: theme.textSecondary }]}>
              ${coach.monthlyPrice}/mo
            </Text>
          )}
        </View>
        
        <Text 
          style={[styles.description, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {coach.description}
        </Text>
        
        {coach.features && coach.features.length > 0 && (
          <View style={styles.features}>
            {coach.features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={14} 
                  color={coach.colorTheme.primary} 
                />
                <Text 
                  style={[styles.featureText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      {isActive && (
        <View style={[styles.activeIndicator, { backgroundColor: coach.colorTheme.primary }]} />
      )}
    </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
  },
  compactName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  features: {
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});