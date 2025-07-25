import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useEUDetection } from '../hooks/useEUDetection';
import { GDPRConsentFlow } from '../components/GDPRConsentFlow';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp, resetPassword } = useAuth();
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const { isEUUser, isLoading: isDetectingEU } = useEUDetection();
  
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGDPRConsent, setShowGDPRConsent] = useState(false);
  const [gdprConsentCompleted, setGdprConsentCompleted] = useState(false);



  const handlePrivacyPolicyPress = () => {
    // Navigate to Privacy Policy screen if in app context, otherwise open web link
    try {
      navigation.navigate('PrivacyPolicy');
    } catch (error) {
      Linking.openURL('https://noisemeld.com/privacy');
    }
  };

  const handleSubmit = async () => {
    if (!email || (mode !== 'forgotPassword' && !password)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (mode === 'signUp' && !fullName) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (mode === 'signUp' && !privacyAccepted) {
      Alert.alert('Privacy Policy Required', 'You must accept the Privacy Policy to create an account');
      return;
    }

    // For EU users signing up, show GDPR consent flow first
    if (mode === 'signUp' && isEUUser && !gdprConsentCompleted) {
      setShowGDPRConsent(true);
      return;
    }

    // Validate password for signup
    if (mode === 'signUp' && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      let result;
      
      switch (mode) {
        case 'signIn':
          result = await signIn(email, password);
          break;
        case 'signUp':
          result = await signUp(email, password, fullName, privacyAccepted);
          break;
        case 'forgotPassword':
          result = await resetPassword(email);
          if (!result.error) {
            Alert.alert('Success', 'Password reset email sent!');
            setMode('signIn');
          }
          break;
      }

      if (result?.error) {
        // Check if this is the email confirmation message
        if (mode === 'signUp' && result.error.message.includes('check your email to confirm')) {
          // Navigate to confirmation screen without showing alert
          navigation.navigate('EmailConfirmation', { email });
          return; // Exit early to prevent any other processing
        } else {
          Alert.alert('Error', result.error.message);
        }
      }
      // Note: If signup is successful and email confirmation is disabled,
      // the user will be automatically signed in and navigation will happen
      // automatically due to the auth state change
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signIn':
        return 'Welcome Back';
      case 'signUp':
        return 'Create Account';
      case 'forgotPassword':
        return 'Reset Password';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'signIn':
        return 'Sign In';
      case 'signUp':
        return 'Sign Up';
      case 'forgotPassword':
        return 'Send Reset Email';
    }
  };

  const handleGDPRConsentComplete = () => {
    setShowGDPRConsent(false);
    setGdprConsentCompleted(true);
    // Automatically proceed with signup after GDPR consent
    setTimeout(() => {
      handleSubmit();
    }, 100); // Small delay to ensure state updates
  };

  // Show GDPR consent flow for EU users during signup
  if (showGDPRConsent && isEUUser) {
    return (
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={handleGDPRConsentComplete}
        onSkip={() => setShowGDPRConsent(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {getTitle()}
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your Personalized AI Health Coach
        </Text>

        <View style={styles.form}>
          {mode === 'signUp' && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {mode !== 'forgotPassword' && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          {mode === 'signUp' && (
            <TouchableOpacity
              style={styles.privacyContainer}
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                {
                  borderColor: theme.border,
                  backgroundColor: privacyAccepted ? theme.primary : 'transparent',
                }
              ]}>
                {privacyAccepted && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={[styles.privacyText, { color: theme.text }]}>
                  I agree to the{' '}
                  <Text 
                    style={[styles.privacyLink, { color: theme.primary }]}
                    onPress={handlePrivacyPolicyPress}
                  >
                    Privacy Policy
                  </Text>
                  {' '}and understand how my data will be processed.
                </Text>
                {isEUUser && (
                  <Text style={[styles.gdprNote, { color: theme.textSecondary }]}>
                    As an EU resident, you'll have additional privacy options in the next step.
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{getButtonText()}</Text>
            )}
          </TouchableOpacity>

          {mode === 'signIn' && (
            <>
              <TouchableOpacity
                onPress={() => setMode('forgotPassword')}
                style={styles.linkButton}
              >
                <Text style={[styles.linkText, { color: theme.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <View style={styles.switchMode}>
                <Text style={[styles.switchText, { color: theme.textSecondary }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => setMode('signUp')}>
                  <Text style={[styles.linkText, { color: theme.primary }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'signUp' && (
            <View style={styles.switchMode}>
              <Text style={[styles.switchText, { color: theme.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => setMode('signIn')}>
                <Text style={[styles.linkText, { color: theme.primary }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'forgotPassword' && (
            <TouchableOpacity
              onPress={() => setMode('signIn')}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 16,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  privacyLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  gdprNote: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});