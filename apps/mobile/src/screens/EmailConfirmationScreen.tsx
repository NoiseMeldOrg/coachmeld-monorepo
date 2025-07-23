import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type EmailConfirmationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailConfirmation'
>;

type EmailConfirmationScreenRouteProp = RouteProp<
  RootStackParamList,
  'EmailConfirmation'
>;

export const EmailConfirmationScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<EmailConfirmationScreenNavigationProp>();
  const route = useRoute<EmailConfirmationScreenRouteProp>();
  const { email } = route.params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="mail" size={64} color={theme.primary} />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>
          Check Your Email
        </Text>
        
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          We've sent a confirmation email to:
        </Text>
        
        <Text style={[styles.email, { color: theme.text }]}>
          {email}
        </Text>
        
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          Please click the link in the email to confirm your account. 
          Once confirmed, you can sign in to CoachMeld.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Didn't receive the email? Check your spam folder or wait a few minutes.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    maxWidth: '100%',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});