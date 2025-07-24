import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

// Import providers
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { UserProvider } from './src/context/UserContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CoachProvider } from './src/context/CoachContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { StripeProviderWrapper } from './src/components/StripeProviderWrapper';

// Import components
import { BottomTabNavigator } from './src/components/BottomTabNavigator';

// Import screens
import { DietSelectionScreen } from './src/screens/DietSelectionScreen';
import { CoachMarketplaceScreen } from './src/screens/CoachMarketplaceScreen';
import AuthScreen from './src/screens/AuthScreen';
import { EmailConfirmationScreen } from './src/screens/EmailConfirmationScreen';
import { PaymentSuccessScreen } from './src/screens/PaymentSuccessScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { EditProfileFieldScreen } from './src/screens/EditProfileFieldScreen';
import { CoachChatScreen } from './src/screens/CoachChatScreen';
import { SavedRecipesScreen } from './src/screens/SavedRecipesScreen';

const Stack = createStackNavigator();

function AppContent() {
  const { theme, isDark } = useTheme();
  const { user, loading } = useAuth();
  
  // Configure Android navigation bar button colors based on theme
  const setNavigationBarStyle = React.useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        // Set navigation bar button color (light for dark theme, dark for light theme)
        // Note: Background color cannot be set with edge-to-edge mode enabled
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        
        // Also set visibility to ensure it's shown
        await NavigationBar.setVisibilityAsync('visible');
      } catch (error) {
        console.warn('Failed to set navigation bar style:', error);
      }
    }
  }, [isDark]);
  
  React.useEffect(() => {
    setNavigationBarStyle();
  }, [setNavigationBarStyle]);
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }
  
  const linking = {
    prefixes: ['https://coachmeld.app', 'coachmeld://'],
    config: {
      screens: {
        MainTabs: 'home',
        DietSelection: 'diet-selection',
        Marketplace: 'marketplace',
        Subscription: 'subscription',
        PaymentSuccess: 'payment-success',
        Auth: 'auth',
        EmailConfirmation: 'email-confirmation',
        EditProfile: 'edit-profile',
        EditProfileField: 'edit-profile-field',
      },
    },
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer 
        linking={linking}
        onStateChange={() => {
          // Reapply navigation bar style on navigation state change
          setNavigationBarStyle();
        }}
      >
        <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen 
              name="Coach" 
              component={CoachChatScreen}
              options={{
                presentation: 'modal',
                headerShown: false,
                gestureEnabled: false, // Disable swipe-to-dismiss
                ...Platform.select({
                  ios: {
                    modalPresentationStyle: 'fullScreen',
                  },
                  android: {
                    animation: 'slide_from_bottom',
                  },
                }),
              }}
            />
            <Stack.Screen 
              name="DietSelection" 
              component={DietSelectionScreen} 
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Marketplace" 
              component={CoachMarketplaceScreen} 
              options={{
                headerShown: true,
                headerTitle: 'Choose a Coach',
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
            />
            <Stack.Screen 
              name="Subscription" 
              component={SubscriptionScreen} 
              options={{
                headerShown: true,
                headerTitle: 'Subscription',
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
            />
            <Stack.Screen 
              name="PaymentSuccess" 
              component={PaymentSuccessScreen} 
              options={{
                headerShown: true,
                headerTitle: 'Payment Successful',
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
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen} 
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="EditProfileField" 
              component={EditProfileFieldScreen} 
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="SavedRecipes" 
              component={SavedRecipesScreen} 
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen 
              name="EmailConfirmation" 
              component={EmailConfirmationScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}

export default function App() {
  // Add error boundary and debug logging for web deployment
  React.useEffect(() => {
    console.log('App starting...');
    console.log('Platform:', Platform.OS);
    console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('Environment vars available:', Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')));
  }, []);

  try {
    return (
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <StripeProviderWrapper>
              <CoachProvider>
                <SubscriptionProvider>
                  <AppContent />
                </SubscriptionProvider>
              </CoachProvider>
            </StripeProviderWrapper>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('App crashed:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>
          App Error: {error.message}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({});