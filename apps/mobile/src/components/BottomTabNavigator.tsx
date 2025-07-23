import React, { useEffect } from 'react';
import { StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import * as NavigationBar from 'expo-navigation-bar';
import { useFocusEffect } from '@react-navigation/native';

import { ProfileScreen } from '../screens/ProfileScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MealPlanScreen } from '../screens/MealPlanScreen';

const Tab = createBottomTabNavigator();

// Placeholder component for Coach tab (never actually rendered)
const CoachTabPlaceholder: React.FC = () => {
  return null;
};

export const BottomTabNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Ensure navigation bar style is applied when tab navigator is focused
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => {});
      }
    }, [isDark])
  );

  // Calculate proper tab bar height
  const tabBarHeight = Platform.OS === 'ios' ? 85 : 70;
  const tabBarPaddingBottom = Platform.OS === 'ios' ? 25 : Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      detachInactiveScreens={Platform.OS === 'android' ? false : true}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: tabBarHeight + (Platform.OS === 'android' ? insets.bottom : 0),
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 15,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          paddingVertical: Platform.OS === 'ios' ? 2 : 0,
        },
        // Prevent gesture conflicts
        tabBarButton: (props) => {
          const { onPress, onLongPress, onPressIn, onPressOut, accessibilityRole, accessibilityState, accessibilityLabel, testID, children, style } = props;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                // Prevent event bubbling and ensure clean tap
                e.stopPropagation();
                if (onPress) {
                  onPress(e);
                }
              }}
              onLongPress={onLongPress || undefined}
              onPressIn={onPressIn || undefined}
              onPressOut={onPressOut || undefined}
              accessibilityRole={accessibilityRole}
              accessibilityState={accessibilityState}
              accessibilityLabel={accessibilityLabel}
              testID={testID}
              style={style}
            >
              {children}
            </TouchableOpacity>
          );
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: -2,
          textAlign: 'center',
        },
        headerStyle: {
          backgroundColor: theme.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerTitle: 'CoachMeld',
        }}
      />
      <Tab.Screen
        name="CoachTab"
        component={CoachTabPlaceholder}
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default action
            e.preventDefault();
            // Navigate to the modal
            navigation.navigate('Coach');
          },
        })}
      />
      <Tab.Screen
        name="MealPlan"
        component={MealPlanScreen}
        options={{
          tabBarLabel: 'Meals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
          headerTitle: 'Meal Plans',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  // No styles needed for now
});