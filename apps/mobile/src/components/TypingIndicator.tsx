import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface TypingIndicatorProps {
  coach?: any;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ coach }) => {
  const { theme } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = animateDot(dot1, 0);
    const animation2 = animateDot(dot2, 150);
    const animation3 = animateDot(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (animatedValue: Animated.Value) => ({
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [{
      scale: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1.2],
      }),
    }],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {coach && (
          <View style={[styles.coachIcon, { backgroundColor: coach.colorTheme?.primary + '20' }]}>
            {coach.iconLibrary === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons 
                name={coach.iconName as any} 
                size={28} 
                color={coach.colorTheme?.primary}
                style={coach.iconRotation ? { transform: [{ rotate: `${coach.iconRotation}deg` }] } : {}}
              />
            ) : (
              <Ionicons 
                name={coach.iconName as any} 
                size={24} 
                color={coach.colorTheme?.primary} 
              />
            )}
          </View>
        )}
        <View style={styles.dotsContent}>
          <View style={styles.dotsContainer}>
          <Animated.View 
            style={[
              styles.dot, 
              { backgroundColor: theme.textSecondary },
              dotStyle(dot1),
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              { backgroundColor: theme.textSecondary },
              dotStyle(dot2),
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              { backgroundColor: theme.textSecondary },
              dotStyle(dot3),
            ]} 
          />
        </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
    alignSelf: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContent: {
    padding: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});