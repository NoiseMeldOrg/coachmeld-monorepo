import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp, resetPassword } = useAuth();
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

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
          result = await signUp(email, password, fullName);
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
          Your AI Carnivore Coach
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
});